$(function () {

  $('#calculate').click(function () {
    var parameters = getParameters(),
        results = iterateScenarios(parameters);
  });

  function getParameters() {
    var parameters = {
      strategy: $('#strategy').val(),
      rarity: parseInt($('#rarity').val()),
      super_chance: parseFloat($('#super_chance').val()) / 100,
      super_bonus: (parseFloat($('#super_bonus').val()) / 100) + 1,
      great_chance: parseFloat($('#great_chance').val()) / 100,
      great_bonus: (parseFloat($('#great_bonus').val()) / 100) + 1,
      start_level: parseInt($('#start_level').val()),
      target_level: parseInt($('#target_level').val()),
      experience_per_card: parseInt($('#exp_per_card').val()),
      card_ap_value: parseFloat($('#card_ap_value').val()),
      qp_ap_value: parseFloat($('#qp_ap_value').val()) / 1000000,
    };

    parameters.start_experience = getRequiredExperienceForLevel(parameters.start_level);
    parameters.target_experience = getRequiredExperienceForLevel(parameters.target_level);

    return parameters;
  }

  async function iterateScenarios(parameters) {
    var scenarios = [],
        extendedScenarios,
        results = {
          number_of_scenarios: 0,
          probablity_coverage: 0,
          average_number_of_cards_used: 0,
          average_qp_used: 0,
          card_ap_value: parameters.card_ap_value,
          qp_ap_value: parameters.qp_ap_value
        },
        loops = 1;

    scenarios.push($.extend({}, parameters, {
      "uid": "",
      "rounds": 0,
      "complete": false,
      "cards_used": 0,
      "qp_used": 0,
      "probability": 1,
      "current_experience": parameters.start_experience,
      "current_level": parameters.start_level
    }));

    while (scenarios.length) {
      if (loops % 1000 == 0) {
        outputResults(results);
        await sleep(100);
      }

      extendedScenarios = extendScenario(scenarios[0], parameters);

      scenarios = extendedScenarios.concat(scenarios).filter(function (scenario) {
        return scenario.uid != scenarios[0].uid;
      });

      scenarios = scenarios.filter(function (scenario) {
        if (scenario.complete) {
          results.number_of_scenarios += 1;
          results.probablity_coverage += scenario.probability;
          results.average_number_of_cards_used += scenario.cards_used * scenario.probability;
          results.average_qp_used += scenario.qp_used * scenario.probability;
        }

        return !scenario.complete;
      });

      loops++;
    }

    outputResults(results);
    console.log(results);

    function sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    function extendScenario(scenario) {
      var extendedScenarios = [],
          numberOfCards;

      switch (scenario.strategy) {
        case "all_in": numberOfCards = executeAllIn(scenario); break;
        case "assume_super": numberOfCards = executeAssumeSuper(scenario); break;
        case "assume_great": numberOfCards = executeAssumeGreat(scenario); break;
        case "adjust_all_in": numberOfCards = executeAdjustAllIn(scenario); break;
        case "adjust_assume_super": numberOfCards = executeAdjustAssumeSuper(scenario); break;
        case "adjust_assume_great": numberOfCards = executeAdjustAssumeGreat(scenario); break;
        case "maximize_level_all_in": numberOfCards = executeMaximizeAllIn(scenario); break;
        case "maximize_level_assume_super": numberOfCards = executeMaximizeAssumeSuper(scenario); break;
        case "maximize_level_assume_great": numberOfCards = executeMaximizeAssumeGreat(scenario); break;
        case "drip_feed": numberOfCards = executeDripFeed(scenario); break;
        default:
          throw "Invalid strategy passed to extendScenario()";
      }

      extendedScenarios.push(continueScenario(scenario, numberOfCards, "success"));
      extendedScenarios.push(continueScenario(scenario, numberOfCards, "super"));
      extendedScenarios.push(continueScenario(scenario, numberOfCards, "great"));

      return extendedScenarios;
    }

    function continueScenario(scenario, numberOfCards, result) {
      var resultId,
          experienceBonus,
          probability,
          experiencePerCard = scenario.experience_per_card,
          experienceGained,
          currentLevel = getCurrentLevelForExperience(scenario.current_experience),
          qpPerCard = getQpPerCard(currentLevel, scenario.rarity),
          qpCost = qpPerCard * numberOfCards,
          remainingExperience = scenario.target_experience - scenario.current_experience,
          newScenario = $.extend({}, scenario);

          switch (result) {
            case "success":
              resultId = "N";
              experienceBonus = 1;
              probability = 1 - scenario.super_chance - scenario.great_chance;
              break;
            case "super":
              resultId = "S";
              experienceBonus = scenario.super_bonus;
              probability = scenario.super_chance;
              break;
            case "great":
              resultId = "G";
              experienceBonus = scenario.great_bonus;
              probability = scenario.great_chance;
              break;
            default:
              throw "Invalid result passed to continueScenario()";
          }

          experienceGained = (experiencePerCard * numberOfCards) * experienceBonus;
          if (experienceGained > remainingExperience)
            experienceGained = remainingExperience;

          newScenario.rounds++;
          newScenario.uid += resultId;
          newScenario.cards_used += numberOfCards;
          newScenario.qp_used += qpCost;
          newScenario.probability *= probability;
          newScenario.current_experience += experienceGained;
          newScenario.current_level = getCurrentLevelForExperience(newScenario.current_experience);
          newScenario.complete = newScenario.current_experience == newScenario.target_experience;

          return newScenario;
    }

    function executeAllIn(scenario) {
      var remainingExperience = scenario.target_experience - scenario.current_experience,
          experiencePerCard = scenario.experience_per_card,
          numberOfCards = Math.ceil(remainingExperience / experiencePerCard);

      return numberOfCards <= 20 ? numberOfCards : 20;
    }

    function executeAssumeSuper(scenario) {
      var remainingExperience = scenario.target_experience - scenario.current_experience,
          experiencePerCard = scenario.experience_per_card,
          superBonus = scenario.super_bonus,
          numberOfCards = Math.ceil(remainingExperience / (experiencePerCard * superBonus));

      return numberOfCards <= 20 ? numberOfCards : 20;
    }

    function executeAssumeGreat(scenario) {
      var remainingExperience = scenario.target_experience - scenario.current_experience,
          experiencePerCard = scenario.experience_per_card,
          greatBonus = scenario.great_bonus,
          numberOfCards = Math.ceil(remainingExperience / (experiencePerCard * greatBonus));

      return numberOfCards <= 20 ? numberOfCards : 20;
    }

    function executeAdjust(scenario) {
      var remainingExperience = scenario.target_experience - scenario.current_experience,
          experiencePerCard = scenario.experience_per_card,
          experiencePerRound = experiencePerCard * 20,
          experienceToAdjust = remainingExperience % experiencePerRound,
          numberOfCards = Math.ceil(experienceToAdjust / experiencePerCard);

      return numberOfCards <= 20 ? numberOfCards : 20;
    }

    function executeMaximize(scenario) {
      var currentLevel = getCurrentLevelForExperience(scenario.current_experience),
          targetLevel = scenario.target_level;

      if (currentLevel == targetLevel)
        return 0;

      var targetExperience = getRequiredExperienceForLevel(currentLevel + 1),
          requiredExperience = targetExperience - scenario.current_experience,
          experiencePerCard = scenario.experience_per_card,
          numberOfCards = Math.floor(requiredExperience / experiencePerCard);

      return numberOfCards <= 20 ? numberOfCards : 20;
    }

    function executeAdjustAllIn(scenario) {
      if (scenario.rounds == 0) {
        return executeAdjust(scenario);
      }

      return executeAllIn(scenario);
    }

    function executeAdjustAssumeSuper(scenario) {
      if (scenario.rounds == 0) {
        return executeAdjust(scenario);
      }

      return executeAssumeSuper(scenario);
    }

    function executeAdjustAssumeGreat(scenario) {
      if (scenario.rounds == 0) {
        return executeAdjust(scenario);
      }

      return executeAssumeGreat(scenario);
    }

    function executeMaximizeAllIn(scenario) {
      var numberOfCards = executeMaximize(scenario);

      return numberOfCards > 0 ? numberOfCards : executeAllIn(scenario);
    }

    function executeMaximizeAssumeSuper(scenario) {
      var numberOfCards = executeMaximize(scenario);

      return numberOfCards > 0 ? numberOfCards : executeAssumeSuper(scenario);
    }

    function executeMaximizeAssumeGreat(scenario) {
      var numberOfCards = executeMaximize(scenario);

      return numberOfCards > 0 ? numberOfCards : executeAssumeGreat(scenario);
    }

    function executeDripFeed(scenario) {
      return 1;
    }
  }

  function combineResults(scenarios) {
    return {
      scenarios: scenarios,
      number_of_scenarios: scenarios.length,
      probablity_coverage: Math.round(scenarios.reduce(function (carry, scenario) {
          return carry + scenario.probability;
        }, 0) * 100 * 1000) / 1000,
      average_number_of_cards_used: Math.round(scenarios.map(function (scenario) {
          return scenario.cards_used * scenario.probability;
        }).reduce(function (carry, weightedNumberOfCards) {
          return carry + weightedNumberOfCards;
        }, 0) * 1000) / 1000,
      average_qp_used: Math.round(scenarios.map(function (scenario) {
          return scenario.qp_used * scenario.probability;
        }).reduce(function (carry, weightedQpUsed) {
          return carry + weightedQpUsed;
        }, 0) * 1000) / 1000,
    };
  }

  function outputResults(results) {
    var probablity_coverage = Math.round(results.probablity_coverage * 100 * 1000) / 1000,
        average_number_of_cards_used = Math.round(results.average_number_of_cards_used / results.probablity_coverage * 1000) / 1000,
        average_qp_used = Math.round(results.average_qp_used / results.probablity_coverage * 1000) / 1000,
        average_ap_value = Math.round(((average_number_of_cards_used * results.card_ap_value) + (average_qp_used * results.qp_ap_value)) * 1000) / 1000;

    $('#results .number_of_scenarios').text(results.number_of_scenarios);
    $('#results .probablity_coverage').text("" + probablity_coverage + "%");
    $('#results .average_number_of_cards_used').text(average_number_of_cards_used);
    $('#results .average_qp_used').text(average_qp_used);
    $('#results .average_converted_ap_value').text(average_ap_value);
  }

  function getCurrentLevelForExperience(experience) {
    var level = 1;

    for (var i in reference.experience_tables) {
      if (reference.experience_tables[i].experience == experience) {
        return reference.experience_tables[i].level;
      } else if (reference.experience_tables[i].experience > experience) {
        return level;
      }

      level = reference.experience_tables[i].level;
    }

    throw "Out of bound experience passed to getCurrentLevelForExperience()";
  }

  function getRequiredExperienceForLevel(level) {
    for (var i in reference.experience_tables) {
      if (reference.experience_tables[i].level == level) {
        return reference.experience_tables[i].experience;
      }
    }

    throw "Invalid level passed to getRequiredExperienceForLevel()";
  }

  function getQpPerCard(level, rarity) {
    var base,
        multiplier;

    switch (rarity) {
      case 1:
        base = 70;
        multiplier = 30;
        break;
      case 2:
        base = 105;
        multiplier = 45;
        break;
      case 3:
        base = 140;
        multiplier = 50;
        break;
      case 4:
        base = 280;
        multiplier = 120;
        break;
      case 5:
        base = 420;
        multiplier = 180;
        break;
      default:
        throw "Invalid rarity passed to getQpPerCard()";
    }

    return base + (level * multiplier);
  }

});