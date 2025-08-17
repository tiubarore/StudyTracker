import { openDB } from "idb";
import { useState, useRef, useEffect } from "react";
import TimerDisplay from "./TimerDisplay";
import TimerControls from "./TimerControls";
import Stats from "./Stats";
import Preset from "./Preset";

const dbPromise = openDB("timer-store", 1, {
  upgrade(db) {
    db.createObjectStore("timer");
  },
});

const Timer = () => {
  const timerRef = useRef(null);
  const [isPresetSelected, setIsPresetSelected] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [accumulatedTime, setAccumulatedTime] = useState(0);
  const [displayTime, setDisplayTime] = useState(0);
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

  useEffect(() => {
    const loadState = async () => {
      try {
        const today = new Date().toDateString();
        const lastDate = localStorage.getItem("lastSavedDate");

        // Reset daily total if it's a new day
        if (lastDate !== today) {
          setDailyTotal(0);
          localStorage.setItem("dailyTotal", 0);
          localStorage.setItem("lastSavedDate", today);
        }

        const saved = await (await dbPromise).get("timer", "current-state");
        if (saved) {
          // Only restore running timer if same day
          if (saved.isRunning && lastDate === today) {
            const elapsed = Math.floor((Date.now() - saved.startTime) / 1000);
            setAccumulatedTime(saved.accumulatedTime + elapsed);
            setDisplayTime(saved.displayTime + elapsed);
            setStartTime(Date.now());
            setIsRunning(true);
          }

          // Always restore these
          setTargetTime(saved.targetTime);
          setSessionComplete(saved.sessionComplete);
          setIsPresetSelected(saved.targetTime > 0);
        }
      } catch (error) {
        console.error("Failed to load timer state:", error);
      }
    };

    loadState();
  }, []);

  // check daily reset
  useEffect(() => {
    const today = new Date().toDateString();
    const lastDate = localStorage.getItem("lastSavedDate");

    if (!lastDate) {
      // First run - initialize date
      localStorage.setItem("lastSavedDate", today);
    } else if (lastDate !== today) {
      // New day - reset daily total
      setDailyTotal(0);
      localStorage.setItem("dailyTotal", 0);
      localStorage.setItem("lastSavedDate", today);
    }
  }, []);

  const selectPresetTime = (minutes) => {
    resetTimer();
    setTargetTime(minutes * 60);
    setIsPresetSelected(true); // Set to true when preset is selected
  };

  const presetTimes = [
    { minutes: 15, label: "15 min" },
    { minutes: 30, label: "30 min" },
    { minutes: 45, label: "45 min" },
    { minutes: 60, label: "1 hour" },
  ];

  // Calculate current time accurately
  const getCurrentTime = () => {
    if (!isRunning || !startTime) return accumulatedTime;
    return accumulatedTime + Math.floor((Date.now() - startTime) / 1000);
  };

  // Calculate remaining time
  const remainingTime =
    targetTime > 0 ? Math.max(0, targetTime - displayTime) : 0;

  // Handle session completion
  const handleSessionComplete = (currentTime) => {
    // First clean up any running timers
    if (timerRef.current) {
      cancelAnimationFrame(timerRef.current);
    }

    // Then update state
    const newDailyTotal = dailyTotal + currentTime;
    const newWeeklyTotal = weeklyTotal + currentTime;
    setDailyTotal(newDailyTotal);
    setWeeklyTotal(newWeeklyTotal);
    setSessionsCompleted((prev) => prev + 1);
    setIsRunning(false);
    setSessionComplete(true);
    setStartTime(null);
    setAccumulatedTime(0);
  };

  // Main timer effect
  useEffect(() => {
    let wakeLock;
    let visibilityHandler;
    let lastUpdateTime = Date.now();
    let wakeLockRetryTimer;
    let isActive = true;

    const updateTimer = () => {
      if (!isActive) return;

      const now = Date.now();
      const currentTime = getCurrentTime();

      if (
        now - lastUpdateTime >= 1000 ||
        document.visibilityState === "visible"
      ) {
        setDisplayTime(currentTime);
        lastUpdateTime = now;

        if (targetTime > 0 && currentTime >= targetTime && isRunning) {
          handleSessionComplete(currentTime);
          return;
        }
      }

      if (isRunning) {
        timerRef.current = requestAnimationFrame(updateTimer);
      }
    };

    const handleVisibilityChange = () => {
      if (!isActive) return;

      if (document.visibilityState === "visible" && isRunning) {
        lastUpdateTime = 0;
        updateTimer();
        reacquireWakeLock(); // Reacquire when coming back to foreground
      } else if (document.visibilityState === "hidden") {
        // Save state when going to background
        backupTimerState();
      }
    };

    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLock = await navigator.wakeLock.request("screen");
          wakeLock.addEventListener("release", () => {
            if (isRunning && isActive) {
              // Schedule retry if released unexpectedly
              wakeLockRetryTimer = setTimeout(requestWakeLock, 1000);
            }
          });
        }
      } catch (err) {
        console.error("Wake Lock error:", err);
        // Retry on failure
        if (isRunning && isActive) {
          wakeLockRetryTimer = setTimeout(requestWakeLock, 2000);
        }
      }
    };

    const reacquireWakeLock = () => {
      if (wakeLockRetryTimer) {
        clearTimeout(wakeLockRetryTimer);
      }
      requestWakeLock();
    };

    const backupTimerState = async () => {
      try {
        await (
          await dbPromise
        ).put(
          "timer",
          {
            startTime,
            accumulatedTime: getCurrentTime(),
            targetTime,
            isRunning,
            savedAt: Date.now(),
          },
          "current-state"
        );
      } catch (error) {
        console.error("Backup failed:", error);
      }
    };

    if (isRunning) {
      requestWakeLock();
      visibilityHandler = handleVisibilityChange;
      document.addEventListener("visibilitychange", visibilityHandler);
      updateTimer();
    }

    return () => {
      isActive = false;

      if (timerRef.current) {
        cancelAnimationFrame(timerRef.current);
      }
      if (wakeLock) {
        wakeLock.removeEventListener("release", requestWakeLock);
        wakeLock.release().catch(console.error);
      }
      if (wakeLockRetryTimer) {
        clearTimeout(wakeLockRetryTimer);
      }
      if (visibilityHandler) {
        document.removeEventListener("visibilitychange", visibilityHandler);
      }
    };
  }, [isRunning, startTime, accumulatedTime, targetTime]);

  // Persist data to localStorage
  useEffect(() => {
    localStorage.setItem("dailyTotal", dailyTotal);
    localStorage.setItem("weeklyTotal", weeklyTotal);
    localStorage.setItem("sessionsCompleted", sessionsCompleted);
  }, [dailyTotal, weeklyTotal, sessionsCompleted]);

  // Add this useEffect with your other effects
  useEffect(() => {
    const saveTimerState = async () => {
      await (
        await dbPromise
      ).put(
        "timer",
        {
          startTime,
          accumulatedTime,
          targetTime,
          isRunning,
          sessionComplete,
          displayTime,
        },
        "current-state"
      );
    };

    // Save every 30 seconds when running
    const interval = setInterval(() => {
      if (isRunning) saveTimerState();
    }, 30000);

    return () => clearInterval(interval);
  }, [
    startTime,
    accumulatedTime,
    targetTime,
    isRunning,
    sessionComplete,
    displayTime,
  ]);

  const toggleTimer = () => {
    if (!isPresetSelected && !isRunning) return;
    if (isRunning) {
      // Pause logic
      setAccumulatedTime(getCurrentTime());
      setStartTime(null);
      setIsRunning(false);
    } else {
      // Start logic
      if (sessionComplete) {
        setAccumulatedTime(0);
        setDisplayTime(0);
        setSessionComplete(false);
      }
      setStartTime(Date.now());
      setIsRunning(true);
    }
  };

  const resetTimer = () => {
    if (timerRef.current) {
      cancelAnimationFrame(timerRef.current);
    }
    setAccumulatedTime(0);
    setDisplayTime(0);
    setStartTime(null);
    setTargetTime(0);
    setSessionComplete(false);
    setIsRunning(false);
    setIsPresetSelected(false); // Reset on full timer reset
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs > 0 ? `${hrs}h ` : ""}${
      mins > 0 || hrs > 0 ? `${mins}m ` : ""
    }${secs}s`;
  };

  const formatTimeForTotals = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs > 0 ? `${hrs}h ` : ""}${mins}m`;
  };

  return (
    <div
      className="flex flex-col p-6 overflow-y-auto lg:mx-auto md:max-w-2xl lg:max-w-4xl"
      style={{ height: "calc(var(--app-height, 100vh) - 1px)" }}
    >
      <div className="mb-8">
        <h3 className="text-lg font-medium mb-3 text-gray-700 text-center">
          Choose your Time
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {presetTimes.map((preset) => (
            <Preset
              key={preset.minutes}
              preset={preset}
              selectPresetTime={selectPresetTime}
              targetTime={targetTime}
            />
          ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col justify-center">
        <TimerDisplay time={displayTime} targetTime={targetTime} />
      </div>
      {targetTime > 0 && (
        <div className="text-center text-sm text-gray-500 mb-6">
          <p className="text-3xl">{formatTime(remainingTime)} remaining</p>
        </div>
      )}
      <TimerControls
        isPresetSelected={isPresetSelected}
        toggleTimer={toggleTimer}
        isRunning={isRunning}
        resetTimer={resetTimer}
        sessionComplete={sessionComplete}
      />
      {/* stats */}
      <Stats
        formatTimeForTotals={formatTimeForTotals}
        dailyTotal={dailyTotal}
        weeklyTotal={weeklyTotal}
      />
    </div>
  );
};

export default Timer;
