import { useState, useRef, useEffect } from "react";
import TimerDisplay from "./TimerDisplay";
import TimerControls from "./TimerControls";

const Timer = () => {
  const timerRef = useRef(null);
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [targetTime, setTargetTime] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [dailyTotal, setDailyTotal] = useState(() => {
    return Number(localStorage.getItem("dailyTotal") || 0);
  });
  const [weeklyTotal, setWeeklyTotal] = useState(() => {
    return Number(localStorage.getItem("weeklyTotal") || 0);
  });
  const [sessionsCompleted, setSessionsCompleted] = useState(() => {
    return Number(localStorage.getItem("sessionsCompleted") || 0);
  });

  const presetTimes = [
    { minutes: 15, label: "15 min" },
    { minutes: 30, label: "30 min" },
    { minutes: 45, label: "45 min" },
    { minutes: 60, label: "1 hour" },
  ];

  useEffect(() => {
    localStorage.setItem("dailyTotal", dailyTotal);
    localStorage.setItem("weeklyTotal", weeklyTotal);
    localStorage.setItem("sessionsCompleted", sessionsCompleted);
  }, [dailyTotal, weeklyTotal, sessionsCompleted]);

  useEffect(() => {
    if (targetTime > 0 && time >= targetTime) {
      clearInterval(timerRef.current);
      setIsRunning(false);
      setSessionComplete(true);
      const newDailyTotal = dailyTotal + time;
      const newWeeklyTotal = weeklyTotal + time;
      setDailyTotal(newDailyTotal);
      setWeeklyTotal(newWeeklyTotal);
      setSessionsCompleted((prev) => prev + 1);
    }
  }, [time, targetTime]);

  const toggleTimer = () => {
    if (isRunning) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    } else {
      if (sessionComplete) {
        setTime(0);
        setSessionComplete(false);
      }
      timerRef.current = setInterval(() => {
        setTime((prevTime) => prevTime + 1);
      }, 1000);
    }
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    clearInterval(timerRef.current);
    setIsRunning(false);
    setTime(0);
    setTargetTime(0);
    setSessionComplete(false);
    timerRef.current = null;
  };

  const selectPresetTime = (minutes) => {
    resetTimer();
    setTargetTime(minutes * 60);
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs > 0 ? `${hrs}h ` : ""}${
      mins > 0 || hrs > 0 ? `${mins}m ` : ""
    }${secs}s`;
  };

  return (
    <div className="h-screen flex flex-col p-6">
      <div className="mb-8">
        <h3 className="text-lg font-medium mb-3 text-gray-700 text-center">
          Study Duration
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {presetTimes.map((preset) => (
            <button
              key={preset.minutes}
              onClick={() => selectPresetTime(preset.minutes)}
              className={`py-3 rounded-xl font-medium transition-all ${
                targetTime === preset.minutes * 60
                  ? "bg-blue-500 text-white shadow-md scale-[0.98]"
                  : "bg-white text-blue-600 border border-gray-200 active:scale-[0.98]"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timer display - centered with more space */}
      <div className="flex-1 flex flex-col justify-center">
        <TimerDisplay time={time} targetTime={targetTime} />
      </div>

      {/* Progress text - more subtle */}
      {targetTime > 0 && (
        <div className="text-center text-sm text-gray-500 mb-6">
          <p>{formatTime(Math.max(0, targetTime - time))} remaining</p>
        </div>
      )}

      {/* Controls - larger and full-width */}
      <TimerControls
        toggleTimer={toggleTimer}
        isRunning={isRunning}
        resetTimer={resetTimer}
        sessionComplete={sessionComplete}
      />

      {/* Stats panel - more integrated design */}
      <div className="mt-8 p-4 bg-white bg-opacity-80 rounded-xl shadow-inner">
        <div className="flex justify-between text-sm">
          <div className="text-center">
            <p className="text-gray-500">Today</p>
            <p className="font-medium">{formatTime(dailyTotal)}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-500">Sessions</p>
            <p className="font-medium">{sessionsCompleted}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-500">Week</p>
            <p className="font-medium">{formatTime(weeklyTotal)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timer;
