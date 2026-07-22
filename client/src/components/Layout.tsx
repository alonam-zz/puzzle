import { Outlet } from "react-router-dom";


export default function Layout() {
  return (
      <div className="d-flex">
        <main className="flex-grow-1 ms-5 pt-5" style={{ minWidth: 0 }}>
          <div className="py-3">
          <Outlet />
          </div>
        </main>
      </div>
  );
}
