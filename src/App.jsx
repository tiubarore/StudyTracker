import Timer from "./components/Timer";
const App = () => {
  return (
    <div className="min-h-screen p-4 bg-gray-100">
      <div className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-md overflow-hidden">
        <Timer />
      </div>
    </div>
  );
};
export default App;