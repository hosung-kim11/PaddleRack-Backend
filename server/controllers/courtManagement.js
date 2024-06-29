const Location = require("../model/location");
const Court = require("../model/court");
const Player = require("../model/player");

async function updateCourtAndPlayerStatus(locationId) {
  const location = await Location.findById(locationId)
    .populate({
      path: "courts",
      populate: { path: "currentPlayers" },
    })
    .populate({
      path: "waitingPlayers",
      populate: { path: "numPlayers" },
    });

  const emptyCourts = location.courts.filter(
    (court) => court.available && court.currentPlayers.length === 0
  );

  // Function to find suitable player combinations
  function findPlayerCombination(
    target,
    startIndex = 0,
    currentCombination = [],
    currentIndexes = []
  ) {
    if (target === 0)
      return { combination: currentCombination, indexes: currentIndexes };
    if (target < 0 || startIndex >= location.waitingPlayers.length) return null;

    for (let i = startIndex; i < location.waitingPlayers.length; i++) {
      const player = location.waitingPlayers[i];
      const result = findPlayerCombination(
        target - player.numPlayers,
        i + 1,
        [...currentCombination, player],
        [...currentIndexes, i]
      );
      if (result) return result;
    }

    return null;
  }

  // Attempt to fill each empty court
  emptyCourts.forEach((court) => {
    const result = findPlayerCombination(4);
    if (result) {
      // Update court with found players
      court.currentPlayers = result.combination;
      court.available = false; // Court is now in use
      court.save();

      // Remove players from waiting list
      result.indexes
        .sort((a, b) => b - a)
        .forEach((index) => {
          location.waitingPlayers.splice(index, 1);
        });

      // Update players' current court
      result.combination.forEach(async (player) => {
        player.currentCourt = court._id;
        await player.save();
      });
    }
  });

  await location.save();
}

module.exports = {
  updateCourtAndPlayerStatus,
};
