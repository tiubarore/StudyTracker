const TimerControls = ({
  toggleTimer,
  isRunning,
  resetTimer,
  sessionComplete,
}) => {
  return (
    <div className="flex justify-center space-x-4 my-6">
      <button
        onClick={toggleTimer}
        className={`flex-1 py-4 px-6 rounded-xl font-bold text-white ${
          sessionComplete
            ? "bg-green-500 hover:bg-green-600"
            : isRunning
            ? "bg-yellow-500 hover:bg-yellow-600"
            : "bg-blue-500 hover:bg-blue-600"
        } shadow-md active:scale-95 transition-transform`}
      >
        {sessionComplete ? "New Session" : isRunning ? "Pause" : "Start"}
      </button>

      <button
        onClick={resetTimer}
        className="flex-1 py-4 px-6 rounded-xl font-bold bg-red-500 hover:bg-red-600 text-white shadow-md active:scale-95 transition-transform"
      >
        Reset
      </button>
    </div>
  );
};
export default TimerControls;
