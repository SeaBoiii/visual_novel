window.storyData = {
  characters: [
    { id: "kira", name: "Kira", color: "#b5525c", icon: "🛡️" },
    { id: "jannah", name: "Jannah", color: "#5b7aa4", icon: "🌼" },
    { id: "dasha", name: "Dasha", color: "#7a8f4a", icon: "🧭" },
    { id: "xinyi", name: "Xin Yi", color: "#c28a3a", icon: "✨" },
  ],
  meters: {
    affection: {
      kira: 35,
      jannah: 35,
      dasha: 35,
      xinyi: 35,
    },
    trust: {
      kira: 30,
      jannah: 30,
      dasha: 30,
      xinyi: 30,
    },
    tension: {
      kira: 20,
      jannah: 20,
      dasha: 20,
      xinyi: 20,
    },
  },
  start: "arrival",
  scenes: {
    arrival: {
      label: "Chapter One",
      title: "Crosswinds in Sapa",
      text:
        "You check into a mountain retreat where four lives briefly intersect. Kira studies the schedule with calm intensity. Jannah brings tea and a familiar warmth. Dasha watches the mist with a traveler’s quiet gravity. Xin Yi greets you with brave, steady kindness.",
      image: "",
      choices: [
        {
          text: "Offer to help Kira organize the day’s logistics.",
          effects: {
            affection: { kira: +10, jannah: -2 },
            trust: { kira: +6 },
            tension: { kira: -2 },
          },
          next: "kira_plans",
        },
        {
          text: "Sit with Jannah and share an unhurried catch‑up.",
          effects: {
            affection: { jannah: +10, kira: -2 },
            trust: { jannah: +6 },
            tension: { jannah: -2 },
          },
          next: "jannah_talk",
        },
        {
          text: "Join Dasha for a quiet walk into the mist.",
          effects: {
            affection: { dasha: +10 },
            trust: { dasha: +4 },
            tension: { dasha: -1 },
          },
          next: "dasha_walk",
        },
        {
          text: "Stay with Xin Yi and help set up the dinner table.",
          effects: {
            affection: { xinyi: +10 },
            trust: { xinyi: +6 },
            tension: { xinyi: -2 },
          },
          next: "xinyi_dinner",
        },
      ],
    },
    kira_plans: {
      label: "Chapter One",
      title: "Quiet Authority",
      text:
        "Kira’s calm efficiency is magnetic. You follow her lead, and she trusts you with decisions she usually keeps to herself.",
      image: "",
      choices: [
        {
          text: "Match her pace and deliver the plan flawlessly.",
          effects: {
            affection: { kira: +8 },
            trust: { kira: +6 },
            tension: { kira: -2 },
          },
          next: "crossroads",
        },
        {
          text: "Suggest a softer detour to make space for the group.",
          effects: {
            affection: { kira: +4, jannah: +3 },
            trust: { kira: +3, jannah: +2 },
            tension: { kira: +1 },
          },
          next: "crossroads",
        },
      ],
    },
    jannah_talk: {
      label: "Chapter One",
      title: "Steady Warmth",
      text:
        "Jannah listens without hurry. The way she remembers small details makes the room feel safe again.",
      image: "",
      choices: [
        {
          text: "Be fully present and honest with her.",
          effects: {
            affection: { jannah: +8 },
            trust: { jannah: +6 },
            tension: { jannah: -2 },
          },
          next: "crossroads",
        },
        {
          text: "Ask her advice about the others.",
          effects: {
            affection: { jannah: +4, xinyi: +3 },
            trust: { jannah: +3, xinyi: +2 },
            tension: { jannah: +1 },
          },
          next: "crossroads",
        },
      ],
    },
    dasha_walk: {
      label: "Chapter One",
      title: "Mist and Motion",
      text:
        "Dasha moves like she belongs to the landscape. The quiet between you feels like a confession waiting to happen.",
      image: "",
      choices: [
        {
          text: "Share a story you rarely tell.",
          effects: {
            affection: { dasha: +8 },
            trust: { dasha: +6 },
            tension: { dasha: -2 },
          },
          next: "crossroads",
        },
        {
          text: "Keep it light but let the silence linger.",
          effects: {
            affection: { dasha: +4, kira: +3 },
            trust: { dasha: +3 },
            tension: { dasha: +1 },
          },
          next: "crossroads",
        },
      ],
    },
    xinyi_dinner: {
      label: "Chapter One",
      title: "Home by Design",
      text:
        "Xin Yi builds a sense of home from small rituals. Her warmth is direct, deliberate, and hard to ignore.",
      image: "",
      choices: [
        {
          text: "Tell her you want this evening to matter.",
          effects: {
            affection: { xinyi: +8 },
            trust: { xinyi: +6 },
            tension: { xinyi: -2 },
          },
          next: "crossroads",
        },
        {
          text: "Ask her about the people she protects most.",
          effects: {
            affection: { xinyi: +4, jannah: +3 },
            trust: { xinyi: +3, jannah: +2 },
            tension: { xinyi: +1 },
          },
          next: "crossroads",
        },
      ],
    },
    crossroads: {
      label: "Chapter Two",
      title: "The Choice Beneath the Lanterns",
      text:
        "The night shifts. Each bond has weight now, and the direction you take will define the ending.",
      image: "",
      choices: [
        {
          text: "Stand with Kira when the pressure rises.",
          effects: {
            affection: { kira: +8 },
            trust: { kira: +5 },
            tension: { kira: -1 },
          },
          next: "ending_gate",
        },
        {
          text: "Choose Jannah’s steady loyalty.",
          effects: {
            affection: { jannah: +8 },
            trust: { jannah: +5 },
            tension: { jannah: -1 },
          },
          next: "ending_gate",
        },
        {
          text: "Follow Dasha into the unknown horizon.",
          effects: {
            affection: { dasha: +8 },
            trust: { dasha: +5 },
            tension: { dasha: -1 },
          },
          next: "ending_gate",
        },
        {
          text: "Promise Xin Yi clarity and presence.",
          effects: {
            affection: { xinyi: +8 },
            trust: { xinyi: +5 },
            tension: { xinyi: -1 },
          },
          next: "ending_gate",
        },
        {
          text: "Try to hold every thread at once.",
          effects: {
            affection: { kira: +3, jannah: +3, dasha: +3, xinyi: +3 },
            trust: { kira: +2, jannah: +2, dasha: +2, xinyi: +2 },
            tension: { kira: +3, jannah: +3, dasha: +3, xinyi: +3 },
          },
          next: "ending_gate",
        },
      ],
    },
    ending_gate: {
      label: "Finale",
      title: "What Remains",
      text: "The night settles. The bonds you built decide what stays.",
      image: "",
      choices: [
        {
          text: "See how the night ends.",
          effects: {},
          next: "ending",
        },
      ],
    },
    ending: {
      label: "Ending",
      title: "After the Lanterns",
      text: "",
      image: "",
      ending: true,
    },
  },
  endings: [
    {
      id: "true_partner_kira",
      title: "True Partner Ending — Kira",
      text:
        "You choose with clarity, and Kira lets you in. The partnership is steady, equal, and built on earned trust.",
      conditions: [
        { type: "min", meter: "affection", character: "kira", value: 70 },
        { type: "top_is", meter: "affection", character: "kira" },
        { type: "top_diff_gte", meter: "affection", value: 10 },
      ],
    },
    {
      id: "true_partner_jannah",
      title: "True Partner Ending — Jannah",
      text:
        "You choose with clarity, and Jannah stays. The partnership feels warm, deliberate, and finally certain.",
      conditions: [
        { type: "min", meter: "affection", character: "jannah", value: 70 },
        { type: "top_is", meter: "affection", character: "jannah" },
        { type: "top_diff_gte", meter: "affection", value: 10 },
      ],
    },
    {
      id: "true_partner_dasha",
      title: "True Partner Ending — Dasha",
      text:
        "You choose with clarity, and Dasha stops running. The partnership is quiet, deep, and chosen without fear.",
      conditions: [
        { type: "min", meter: "affection", character: "dasha", value: 70 },
        { type: "top_is", meter: "affection", character: "dasha" },
        { type: "top_diff_gte", meter: "affection", value: 10 },
      ],
    },
    {
      id: "true_partner_xinyi",
      title: "True Partner Ending — Xin Yi",
      text:
        "You choose with clarity, and Xin Yi is fully seen. The partnership is present, loyal, and built to last.",
      conditions: [
        { type: "min", meter: "affection", character: "xinyi", value: 70 },
        { type: "top_is", meter: "affection", character: "xinyi" },
        { type: "top_diff_gte", meter: "affection", value: 10 },
      ],
    },
    {
      id: "harem",
      title: "Harem Ending",
      text:
        "Against the odds, every bond stays warm. The balance is fragile, but for now, it holds.",
      conditions: [
        { type: "min", meter: "affection", character: "kira", value: 55 },
        { type: "min", meter: "affection", character: "jannah", value: 55 },
        { type: "min", meter: "affection", character: "dasha", value: 55 },
        { type: "min", meter: "affection", character: "xinyi", value: 55 },
      ],
    },
    {
      id: "bittersweet",
      title: "Bittersweet Ending",
      text:
        "A choice is made, but the distance between hearts was too small to close cleanly. Love remains, with a quiet ache.",
      conditions: [
        { type: "max_ge", meter: "affection", value: 60 },
        { type: "top_diff_lte", meter: "affection", value: 9 },
      ],
    },
    {
      id: "lonely",
      title: "Lonely Ending",
      text:
        "The night ends without a clear anchor. You leave with your freedom intact, but something remains unfinished.",
      conditions: [
        { type: "max_le", meter: "affection", value: 49 },
      ],
    },
    {
      id: "chaos",
      title: "Chaos Ending",
      text:
        "Mixed signals and crossed lines collapse the night into confusion. You walk away knowing what not to repeat.",
      conditions: [],
    },
  ],
};
