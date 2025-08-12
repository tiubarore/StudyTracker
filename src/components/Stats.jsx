const Stats = ({ formatTimeForTotals, dailyTotal, weeklyTotal }) => {
  return (
    <div className="mt-4 p-4 bg-white bg-opacity-80 rounded-xl shadow-inner">
      <div className="flex justify-around text-sm">
        <div className="text-center">
          <p className="text-gray-500">Today</p>
          <p className="font-medium">{formatTimeForTotals(dailyTotal)}</p>
        </div>
        {/* <div className="text-center">
            <p className="text-gray-500">Sessions</p>
            <p className="font-medium">{sessionsCompleted}</p>
          </div> */}
        <div className="text-center">
          <p className="text-gray-500">Week</p>
          <p className="font-medium">{formatTimeForTotals(weeklyTotal)}</p>
        </div>
      </div>
    </div>
  );
};
export default Stats;
