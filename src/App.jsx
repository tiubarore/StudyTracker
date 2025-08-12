import { useState, useEffect } from "react";
import Timer from "./components/Timer";

const App = ({ isRunning }) => {
  const [windowHeight, setWindowHeight] = useState("100vh");

  useEffect(() => {
    // Handle mobile viewport height
    const handleResize = () => {
      document.documentElement.style.setProperty(
        "--app-height",
        `${window.innerHeight}px`
      );
      setWindowHeight(`${window.innerHeight}px`);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isRunning) {
        e.preventDefault();
        return (e.returnValue = "Timer is running. Close anyway?");
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isRunning]);

  return (
    <div className="min-h-screen bg-gray-50" style={{ height: windowHeight }}>
      <Timer />
    </div>
  );
};
export default App;
