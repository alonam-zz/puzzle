
import sharp from "sharp"
// Get active areas grouped for the <Select> component.
async function puzzleMe(req, res){

    const maxImageHeight = Number(process.env.VITE_MAX_IMAGE_HEIGHT);
   try {
    if (!req.file) {
      return res.status(400).json({
        message: "No file received",
      });
    }

    const piecesNum = Number(req.body.piecesNum);
    if (!Number.isInteger(piecesNum) || piecesNum<=0) {
      return res.status(400).json({
        message: "No pieces number received",
      });
    }

    
    let imageBuffer = await sharp(req.file.buffer).
        autoOrient().
        toBuffer();
    
    let metadata = await sharp(imageBuffer).metadata();

    let imageWidth = Number(metadata.width);
    let imageHeight = Number(metadata.height);

    if (!imageHeight || !imageWidth){
        return res.status(400).json({
            message:"Cannot detect image dimensions"
        })
    }

    if (imageHeight>maxImageHeight){
         imageBuffer = await sharp(req.file.buffer)
            .autoOrient()
            .resize({
                height: maxImageHeight,
                withoutEnlargement: true,
            })
            .toBuffer();

        metadata = await sharp(imageBuffer).metadata();

        imageWidth = Number(metadata.width);
        imageHeight = Number(metadata.height);
    }

    console.log(imageWidth);
    console.log(imageHeight);
    let pieces = []

    const pieceHeight = Math.floor(imageHeight/piecesNum);
    const pieceWidth = Math.floor(imageWidth/piecesNum);
    let counter =1;
    let currentHeight,currentWidth;

    for (let top=0,rows=0; rows<piecesNum; top+=pieceHeight,rows+=1){
        for (let left=0,cols=0; cols<piecesNum; left+=pieceWidth,cols+=1){
            if (rows<piecesNum-1){
                    currentHeight = Math.min(
                    pieceHeight, imageHeight-top   
                ) 
            }
            else{
                currentHeight = imageHeight - top;
            }

            if (cols<piecesNum-1){
                currentWidth = Math.min(
                    pieceWidth, imageWidth-left   
                ) 
            }
            else{
                currentWidth = imageWidth - left;
            }

            console.log("---",currentHeight);
            console.log(currentWidth);
            const pieceBuffer = await sharp(imageBuffer)
                .extract({
                    left,
                    top,
                    width: currentWidth,
                    height: currentHeight,
                })
                .png()
                .toBuffer();
            
            pieces.push({
                counter:counter,
                row:rows,
                col:cols,
                currentWidth:currentWidth,
                currentHeight:currentHeight,
                image:`data:image/png;base64,${pieceBuffer.toString("base64")}`,
            });
            
            counter +=1;
        }
    }

    // const content = req.file.buffer.toString("utf-8");
    // console.log("File name:", req.file.originalname);
    // console.log("File type:", req.file.mimetype);
    // console.log("File size:", req.file.size);
    // console.log("Content:", content);

     res.json({ pieces: pieces ,imageBuffer:imageBuffer.toString("base64")});
  } catch (error) {
    console.error('Puzzle error:', error);
    res.status(500).json({ error: 'Failed to get puzzle' });
  }
}

export default {
  puzzleMe,
};
