const TimerControls = ({
  toggleTimer,
  isRunning,
  resetTimer,
  sessionComplete,
}) => {
  return (
    <div className="flex space-x-4 mb-8">
      <button
        onClick={toggleTimer}
        className={`flex-1 py-5 rounded-xl font-medium text-white ${
          sessionComplete
            ? "bg-green-500"
            : isRunning
            ? "bg-yellow-500"
            : "bg-blue-500"
        } shadow-md active:opacity-80 transition-opacity`}
      >
        {sessionComplete ? "Start New" : isRunning ? "Pause" : "Start"}
      </button>

      <button
        onClick={resetTimer}
        className="flex-1 py-5 rounded-xl font-medium bg-gray-200 text-gray-800 shadow-sm active:opacity-80 transition-opacity"
      >
        Reset
      </button>
    </div>
  );
};
export default TimerControls;
