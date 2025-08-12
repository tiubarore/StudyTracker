const TimerControls = ({
  isPresetSelected,
  toggleTimer,
  isRunning,
  resetTimer,
  sessionComplete,
}) => {
  return (
    <div className="flex space-x-4 mb-8">
      <button
        onClick={toggleTimer}
        disabled={!isPresetSelected && !isRunning} // Disable if no preset selected
        className={`flex-1 py-4 rounded-xl font-medium text-white ${
          !isPresetSelected && !isRunning
            ? "bg-gray-400 cursor-not-allowed" // Disabled state
            : sessionComplete
            ? "bg-green-500 hover:bg-green-600"
            : isRunning
            ? "bg-yellow-500 hover:bg-yellow-600"
            : "bg-blue-500 hover:bg-blue-600"
        }`}
      >
        {!isPresetSelected && !isRunning
          ? "Select Duration"
          : sessionComplete
          ? "Start New Session"
          : isRunning
          ? "Pause"
          : "Start"}
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
