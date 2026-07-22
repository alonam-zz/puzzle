import { useEffect, useRef, useState } from 'react'
import './App.css'
import Countdown from 'react-countdown'

const CONTAINER_WIDTH = 1400
const CONTAINER_HEIGHT = 650
const SNAP_EPS = 20 // px: how close an edge must be to stick
const SIZE_OPTIONS = [2,3,4,5,6];
const DUE_TIME_OPTIONS = [
  {sec:0,desc:"ללא"},
  {sec:60,desc:"דקה"},
  {sec:120,desc:"2 דקות"},
  {sec:180,desc:"3 דקות"},
  {sec:240,desc:"4 דקות"},
  {sec:300,desc:"5 דקות"},
]

type Pos = { left: number; top: number }

type Piece = {
    image: string
    width: number
    height: number
    left: number
    top: number
    col:number,
    row:number,
    groupId:number,
    counter:number
}

type ApiPiece = { image: string; currentWidth: number; currentHeight: number ,row:number,col:number,counter:number};


function App() {
  const [puzzleSize, setPuzzleSize] = useState(SIZE_OPTIONS[0])
  const [dueTime, setDueTime] = useState(0)
  const [gameover, setGameOver] = useState(false)
  const [countDownDueTime, setCountdownDueTime] = useState(0)
  const [imageBuffer, setImageBuffer] = useState("")
  const [isSolved, setIsSolved] = useState(false)
  const [image, setImage] = useState<File | null>(null)
  const [pieces, setPieces] = useState([])
  // positions live in state so a drag can update them (one entry per piece)
  const [positions, setPositions] = useState<Pos[]>([])

  const countdownRef = useRef(null);

  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const solvedImageRef = useRef<HTMLImageElement>(null)
  // drag internals kept in a ref so moving the mouse doesn't re-render on its own
  const dragState = useRef<{ index: number; offsetX: number; offsetY: number } | null>(null)

  const submitImage = async ()=>{
    if (!image) return;
    const formData = new FormData();
    formData.append('file',image);
    formData.append('piecesNum',String(puzzleSize));

    try{
      const res = await fetch("/api/puzzleme",{
        method:"POST",
        body:formData,
      });
      const data = await res.json();
      const apiPieces = data?.pieces ?? [];

      setPieces(
        apiPieces.map ((p:ApiPiece)=>
        ({
          image:p.image,
          width:p.currentWidth,
          height:p.currentHeight,
          left:Math.floor(Math.random() * (CONTAINER_WIDTH - p.currentWidth)),
          top:Math.floor(Math.random() * (CONTAINER_HEIGHT - p.currentHeight)),
          row:p.row,
          col:p.col,
          groupId:p.counter,
          counter:p.counter
        })
      )
      )
      if (dueTime) setCountdownDueTime(Date.now() + dueTime);
      setGameOver(false);
      countdownRef.current?.api.start();
      setImageBuffer(data?.imageBuffer??"");

    }
    catch (error){
      console.log('Error in creating puzzle')
    }

  }

  const onPointerDown = (e: React.PointerEvent<HTMLImageElement>, index: number) => {
    if (gameover) return;
    const rect = e.currentTarget.getBoundingClientRect();
    // remember where inside the piece the user grabbed
    dragState.current = {
      index,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };
    setDraggingIndex(index);
    // route all further pointer events to this piece, even if the cursor outruns it
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  // If any edge of the dragged piece is within SNAP_EPS of a neighbour's
  // opposing edge (and they roughly share the perpendicular axis), stick to it.
  const snapGroupToNeighbour = (group:number,left: number, top: number, index: number, all: Piece[]) => {
    let dx=0,dy = 0;

    const inGroup = all.filter((p)=>p.groupId==group);
    const notInGroup = all.filter((p)=>p.groupId!=group); 
    let neighbour = null;
    for (let j=0;j<notInGroup.length && dx==0 && dy==0;j++){
      for (let i=0;i<inGroup.length && dx==0 && dy==0;i++){ 
        let notInGroupElem = notInGroup[j];
        let inGroupElem = inGroup[i];
        let diff = Math.abs(inGroupElem.counter-notInGroupElem.counter); 
        if (diff!=puzzleSize && diff!=1) continue;
       
        const n = notInGroupElem;
        
        const nL = n.left, nR = n.left + n.width, nT = n.top, nB = n.top + n.height;
        const L = inGroupElem.left,R = inGroupElem.left+inGroupElem.width;
        const T = inGroupElem.top,B = inGroupElem.top+inGroupElem.height;
        
        if (diff==1 && inGroupElem.row==n.row){
          // side-by-side: only snap if they overlap vertically (same row-ish)
          const vOverlap = (T < nB && T > nT) || (B>nT && B<nB);
          if (vOverlap) { 
            console.log("vOverlap!!!");  
            let matched = false;
            
            if (Math.abs(R - nL) <= SNAP_EPS && inGroupElem.counter<n.counter) { dx = nL-R; matched = true; }// stick to neighbour's left
            else if (Math.abs(L - nR) <= SNAP_EPS && inGroupElem.counter>n.counter) { dx = nR-L; matched=true;} // stick to neighbour's right
            if (matched){
              dy = (T < nB && T > nT) ? nT-T : nB-B; 
              neighbour = n;
            }
          }
        }
        else if (diff==puzzleSize && inGroupElem.col==n.col){ console.log("same col");
          // stacked: only snap if they overlap horizontally (same column-ish)
          console.log("L",L,"nR",nR,"nL",nL,"R",R);
          const hOverlap = (L < nR && L > nL) || (R<nR && R>nL);
          if (hOverlap) { 
            console.log("hOverlap!!!");
            let matched = false; 
            
            if (Math.abs(B - nT) <= SNAP_EPS && inGroupElem.counter<n.counter) { console.log("real top before change:",inGroupElem.top); dy = nT - B; matched=true;}// stick above neighbour
            else if (Math.abs(T - nB) <= SNAP_EPS && inGroupElem.counter>n.counter) {console.log("real top before change:",inGroupElem.top); dy = nB - T ; matched=true;} // stick below neighbour
            if (matched){
              dx = (L < nR && L > nL) ? nL - L : nR - R;
              neighbour = n;
            }
          }
        }


      }
    }
    return {dx:dx,dy:dy,neighbour:neighbour};
  };

  const onPointerMove = (e: React.PointerEvent<HTMLImageElement>) => {
    if (gameover) return;
    const drag = dragState.current;
    const container = containerRef.current;
    if (!drag || !container) return;
    
    const cRect = container.getBoundingClientRect();
    const rawLeft = e.clientX - cRect.left - drag.offsetX;
    const rawTop = e.clientY - cRect.top - drag.offsetY;
    const groupId = pieces[drag.index].groupId;

    setPieces(prev => {
      const dragged = prev[drag.index];
      let dx = rawLeft - dragged.left;
      let dy = rawTop - dragged.top;

      // bounding box of the whole group being dragged
      const group = prev.filter(p => p.groupId === groupId);
      const minLeft = Math.min(...group.map(p => p.left));
      const maxRight = Math.max(...group.map(p => p.left + p.width));
      const minTop = Math.min(...group.map(p => p.top));
      const maxBottom = Math.max(...group.map(p => p.top + p.height));

      // clamp the delta so NO piece in the group leaves the container
      dx = Math.max(-minLeft, Math.min(dx, CONTAINER_WIDTH - maxRight));
      dy = Math.max(-minTop, Math.min(dy, CONTAINER_HEIGHT - maxBottom));

      return prev.map(p =>
        p.groupId === groupId ? { ...p, left: p.left + dx, top: p.top + dy } : p
      );
    });
  };

  const onPointerUp = (e: React.PointerEvent<HTMLImageElement>) => {
    if (gameover) return;
    const drag = dragState.current;
    
    if (drag) {
      // snap to the closest neighbour only now, on release
      
      
      setPieces(prev =>{
        let dragged_piece = prev[drag.index];  
            let {dx,dy,neighbour} = 
              snapGroupToNeighbour(dragged_piece.groupId,dragged_piece.left, dragged_piece.top, drag.index, prev);
            return prev.map((p, i) => {
              
                if (p.groupId==dragged_piece.groupId){
                  return {...p,left:p.left+dx,top:p.top+dy}
                }
                else{ 
                  if (neighbour && p.groupId == neighbour.groupId){
                    return {...p,groupId:dragged_piece.groupId}
                  }
                  else return p;
                }
              })
    });
    }
    dragState.current = null;
    setDraggingIndex(null);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };


  const checkIfBelong = (prev_pos:Pos,pos:Pos,cur_index:number)=>{
    if (cur_index%puzzleSize==0){
            if (Math.abs(pos.top - prev_pos.top-Number(pieces[cur_index-1].height)) != 0) {
              return false; 
            }
            return true;
            //need to check also that left is like left on the first image
          }
          
          //same row
          if (pos.top!=prev_pos.top ) {
            return false;
          }
          if (pos.left - (prev_pos.left + Number(pieces[cur_index-1].width))!=0) {
            return false;
          }
          return true;
  }
  // Solved when every piece sits flush after the previous one, in data.pieces order.
  // Same top + left exactly one piece-width along = correct order AND no gap.

    useEffect(()=>{
      setIsSolved(
        pieces.length > 0 &&
        pieces.every((p, i) => {
          if (i === 0) return true
          const prev = pieces[i - 1]
          if (checkIfBelong(prev,p,i)) 
            return true;

          return false;
          
        })
      )
    },[pieces])


    useEffect(()=>{
      if (isSolved){
        countdownRef.current?.api.pause();
        solvedImageRef.current.style.left = String(pieces[0].left+'px');
        solvedImageRef.current.style.top = String(pieces[0].top)+'px';
        solvedImageRef.current.style.zIndex = "10000";
        solvedImageRef.current.src=`data:image/png;base64,${imageBuffer}`;
      }
    },  
    [isSolved])


    const countdownRenderer = ({ formatted })=>{
       return (
      <span>
        {formatted.hours}:{formatted.minutes}:{formatted.seconds}
      </span>
    );
    }
    
  return (
    <>
    <div className="d-flex flex-column gap-3">
      <div className="align-items-center row">
        
         {pieces.length==0 && (
          <>
          <div className="col-auto">
            <label htmlFor="puzzleFile" className="custom-file-upload bg-warning-subtle" >
              בחר תמונה
          </label>
          <input id="puzzleFile" style={{display:'none'}} className="form-control w-auto" type="file" name="puzzleFile" onChange={(e)=>setImage(e.target.files?.[0] ?? null )}/>
          {image && <span className="ms-2 text-muted">{image.name}</span>}
          </div>
          <div className="col-auto d-inline-block ">
            <label htmlFor="puzzleSize" className='me-2'>
              גודל
            </label>
          <select value={puzzleSize} id="puzzleSize" name="puzzleSize" className="form-select w-auto d-inline-block" onChange={(e)=>{setPuzzleSize(Number(e.target.value))}}>
              {
              SIZE_OPTIONS.map((s,i)=>(
                <option key={i} value={s}>{s+'X'+s}</option>
              )
            )
          }

          </select>
          </div>

          <div className="col-auto d-inline-block ">
            <label htmlFor="dueTime" className='me-2'>
              זמן
            </label>
          <select value={dueTime} id="dueTime" name="puzzleSize" className="form-select w-auto d-inline-block" onChange={(e)=>{setDueTime(Number(e.target.value))}}>
              {
              DUE_TIME_OPTIONS.map((s,i)=>(
                <option key={i} value={s.sec*1000}>{s.desc}</option>
              )
            )
          }

          </select>
          </div>

          <div className="col-auto">
          <button className="btn btn-primary" disabled={!image} type="button" onClick={()=>{submitImage();}}>צור פאזל!</button>
          </div>
          </>
         )}
        {pieces.length!=0 && (
          <>
          <div className="col-auto flex-grow-1">
          <button className="btn btn-success me-2" disabled={!image} type="button" onClick={()=>{setPieces([]); setImage(null)}}>צור פאזל חדש</button>
          <button className="btn btn-primary" disabled={!image} type="button" onClick={()=>{submitImage();}}>התחל מחדש</button>
          </div>
        { dueTime!=0 && (
          <div className="col-auto">
          {
            gameover && (
              <label className='text-danger d-inline-block me-2 fw-bold'>
              הזמן נגמר!
            </label>
            )
          }
          <div className="d-inline-block">
            <Countdown ref={countdownRef}  zeroPadTime={2} date={countDownDueTime} renderer={countdownRenderer} onComplete={()=>{console.log('strstt'); if (!isSolved){ setGameOver(true)}}} />
          </div>
          </div>
        )}
          </>
        )

        
        }
       
      </div>

      <div className="row">
        <div className="col-auto">
          <div className="card m-auto col-auto bg-light"
            ref={containerRef}
              style={{
                width: `${CONTAINER_WIDTH}px`,
                height: CONTAINER_HEIGHT,
                position: 'relative',
              }}
          >
            <div
              
            >
              {
                pieces.map((p, i)=>{
                  return (
                    <img
                      className='puzzleParts'
                      draggable={false}
                      key={i}
                      src={p?.image}
                      onPointerDown={(e)=>onPointerDown(e, i)}
                      onPointerMove={onPointerMove}
                      onPointerUp={onPointerUp}
                      style={{
                        position: 'absolute',
                        left: p.left,
                        top: p.top,
                        width: p.width,
                        height: p.height,
                        zIndex: draggingIndex === i ? 1000 : 1,
                        cursor: 'grab',
                        touchAction: 'none',
                        userSelect: 'none',
                      }}
                    />
                  );
                })
              }
              {
                isSolved && (
                  <img  draggable={false} style={{position: 'absolute',border: '7px solid green'}} ref={solvedImageRef}  />
                )
              }
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  )
}

export default App
