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
      exp_per_card: parseInt($('#exp_per_card').val()),
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
      "uid": "0",
      "rounds": 0,
      "complete": false,
      "cards_used": 0,
      "qp_used": 0,
      "probability": 1
    });

    incompleteScenarios = scenarios;

    while (incompleteScenarios.length) {
      for (var i in incompleteScenarios) {
        extendedScenarios = extendScenario(incompleteScenarios[i], parameters);

        scenarios.concat(extendedScenarios).filter(function (scenario) {
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
        default:
          throw "Invalid strategy passed to extendScenario()";
      }

      extendedScenarios.push(continueScenario(scenario, numberOfCards, "success"));
      extendedScenarios.push(continueScenario(scenario, numberOfCards, "super"));
      extendedScenarios.push(continueScenario(scenario, numberOfCards, "great"));

      return [];
    }

    function continueScenario(scenario, numberOfCards, result) {
      throw "TODO";
      // TODO
    }

    function executeAllIn(scenario) {
      var remainingExperience = scenario.target_experience - scenario.current_experience,
          experiencePerCard = scenario.experience_per_card,
          numberOfCards = Math.ceil(remainingExperience / experiencePerCard);

      return numberOfCards <= 20 ? numberOfCards : 20;
    }
  }

  function getRequiredExperienceForLevel(level) {
    for (var i in reference.experience_tables) {
      if (reference.experience_tables[i].level == level) {
        return reference.experience_tables[i].experience;
      }
    }

    throw "Invalid level passed to getRequiredExperienceForLevel()";
  }

});