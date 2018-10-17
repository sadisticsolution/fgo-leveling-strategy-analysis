$(function () {

  $('#calculate').click(function () {
    var parameters = getParameters(),
        scenarios = iterateScenarios(parameters),
        results = combineResults(scenarios);

    outputResults(results);
  });

  function getParameters() {
    var parameters = {
      strategy: $('#strategy').val(),
      rarity: parseInt($('#rarity').val()),
      super_chance: parseFloat($('#super_chance').val()) / 100,
      super_bonus: (parseFloat($('#super_bonus').val()) / 100) + 1,
      great_chance: parseFloat($('#great_chance').val()) / 100,
      great_bonus: (parseFloat($('#great_bonus').val()) / 100) + 1,
      experience_per_card: parseInt($('#exp_per_card').val()),
    };

    switch($('#level_range').val()) {
      case "1-60":
        parameters.start_level = 1;
        parameters.target_level = 60;
        break;
      case "60-70":
        parameters.start_level = 60;
        parameters.target_level = 70;
        break;
      case "70-80":
        parameters.start_level = 70;
        parameters.target_level = 80;
        break;
      case "80-90":
        parameters.start_level = 80;
        parameters.target_level = 90;
        break;
      case "90-92":
        parameters.start_level = 90;
        parameters.target_level = 92;
        break;
      case "92-94":
        parameters.start_level = 92;
        parameters.target_level = 94;
        break;
      case "94-96":
        parameters.start_level = 94;
        parameters.target_level = 96;
        break;
      case "96-98":
        parameters.start_level = 96;
        parameters.target_level = 98;
        break;
      case "98-100":
        parameters.start_level = 98;
        parameters.target_level = 100;
        break;
      default:
        throw "Invalid level_range passed to getParameters()";
    }

    parameters.start_experience = getRequiredExperienceForLevel(parameters.start_level);
    parameters.target_experience = getRequiredExperienceForLevel(parameters.target_level);

    return parameters;
  }

  function iterateScenarios(parameters) {
    var scenarios = [],
        incompleteScenarios,
        extendedScenarios;

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

    incompleteScenarios = scenarios;

    while (incompleteScenarios.length) {
      for (var i in incompleteScenarios) {
        extendedScenarios = extendScenario(incompleteScenarios[i], parameters);

        scenarios = scenarios.concat(extendedScenarios).filter(function (scenario) {
          return scenario.uid != incompleteScenarios[i].uid;
        });
      }

      incompleteScenarios = scenarios.filter(function (scenario) {
        return !scenario.complete;
      });
    }

    return scenarios;

    function extendScenario(scenario) {
      var extendedScenarios = [],
          numberOfCards;

      switch (scenario.strategy) {
        case "all_in":
          numberOfCards = executeAllIn(scenario);
          break;
        case "assume_super":
          numberOfCards = executeAssumeSuper(scenario);
          break;
        case "assume_great":
          numberOfCards = executeAssumeGreat(scenario);
          break;
        case "adjust_all_in":
          numberOfCards = executeAdjustAllIn(scenario);
          break;
        case "adjust_assume_super":
          numberOfCards = executeAdjustAssumeSuper(scenario);
          break;
        case "adjust_assume_great":
          numberOfCards = executeAdjustAssumeGreat(scenario);
          break;
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

    function executeAdjustAllIn(scenario) {
      if (scenario.rounds == 0) {
        return executeAdjust(scenario);
      }

      var remainingExperience = scenario.target_experience - scenario.current_experience,
          experiencePerCard = scenario.experience_per_card,
          numberOfCards = Math.ceil(remainingExperience / experiencePerCard);

      return numberOfCards <= 20 ? numberOfCards : 20;
    }

    function executeAdjustAssumeSuper(scenario) {
      if (scenario.rounds == 0) {
        return executeAdjust(scenario);
      }

      var remainingExperience = scenario.target_experience - scenario.current_experience,
          experiencePerCard = scenario.experience_per_card,
          superBonus = scenario.super_bonus,
          numberOfCards = Math.ceil(remainingExperience / (experiencePerCard * superBonus));

      return numberOfCards <= 20 ? numberOfCards : 20;
    }

    function executeAdjustAssumeGreat(scenario) {
      if (scenario.rounds == 0) {
        return executeAdjust(scenario);
      }

      var remainingExperience = scenario.target_experience - scenario.current_experience,
          experiencePerCard = scenario.experience_per_card,
          greatBonus = scenario.great_bonus,
          numberOfCards = Math.ceil(remainingExperience / (experiencePerCard * greatBonus));

      return numberOfCards <= 20 ? numberOfCards : 20;
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
    $('#results .number_of_scenarios').text(results.number_of_scenarios);
    $('#results .probablity_coverage').text("" + results.probablity_coverage + "%");
    $('#results .average_number_of_cards_used').text(results.average_number_of_cards_used);
    $('#results .average_qp_used').text(results.average_qp_used);
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