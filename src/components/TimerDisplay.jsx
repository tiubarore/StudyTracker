const TimerDisplay = ({ time, targetTime }) => {
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="text-center">
      <h2 className="text-5xl font-bold my-4 tracking-tighter">
        {formatTime(time)}
      </h2>
      {targetTime > 0 && (
        <div className="w-full bg-gray-200 rounded-full h-3 mt-4 mx-auto max-w-xs">
          <div
            className="bg-green-500 h-3 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${Math.min(100, (time / targetTime) * 100)}%` }}
          ></div>
        </div>
      )}
    </div>
  );
};
export default TimerDisplay;
