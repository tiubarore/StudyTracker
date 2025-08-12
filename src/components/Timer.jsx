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
    <div className="space-y-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-3 text-center">
          Select Study Duration:
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {presetTimes.map((preset) => (
            <button
              key={preset.minutes}
              onClick={() => selectPresetTime(preset.minutes)}
              className={`w-full py-3 px-4 rounded-lg font-medium ${
                targetTime === preset.minutes * 60
                  ? "bg-blue-600 text-white"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <TimerDisplay time={time} targetTime={targetTime} />

      {targetTime > 0 && (
        <div className="text-center text-sm text-gray-600">
          <p>Target: {formatTime(targetTime)}</p>
          <p>Remaining: {formatTime(Math.max(0, targetTime - time))}</p>
        </div>
      )}

      <TimerControls
        toggleTimer={toggleTimer}
        isRunning={isRunning}
        resetTimer={resetTimer}
        sessionComplete={sessionComplete}
      />

      <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="font-medium mb-3 text-center">Today's Progress</h3>
        <div className="space-y-2">
          <p className="flex justify-between">
            <span className="text-gray-600">Studied:</span>
            <span className="font-medium">{formatTime(dailyTotal)}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-gray-600">Sessions:</span>
            <span className="font-medium">{sessionsCompleted}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-gray-600">Weekly Total:</span>
            <span className="font-medium">{formatTime(weeklyTotal)}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Timer;
