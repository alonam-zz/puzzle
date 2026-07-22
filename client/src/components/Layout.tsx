import { Outlet } from "react-router-dom";


export default function Layout() {
  return (
      <div className="d-flex justify-content-center">
        <main className="pt-5" style={{ minWidth: 0 }}>
          <div className="py-3">
          <Outlet />
          </div>
        </main>
      </div>
  );
}
