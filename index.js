// Code written by Le Codex. Check me out on Github!

const input = document.getElementById("scriptUpload");
const output = document.getElementById("returnList");
const displayTypeInput = document.getElementById("displayTypeInput");

const color_per_message_type = {
  info: "",
  good: "lime",
  great: "aqua",
  warning: "yellow",
  conflict: "red",
  group: "Orchid",
};
const color_per_character_type = {
  global: "",
  townsfolk: "RoyalBlue",
  outsider: "aqua",
  minion: "orange",
  demon: "red",
  traveller: "DarkOrchid",
  fabled: "gold",
  loric: "YellowGreen",
};

let groups = [];
fetch("./groups.json")
  .then((x) => x.json())
  .then((x) => (groups = x));

let categories = {};
fetch("./categories.json")
  .then((x) => x.json())
  .then((x) => (categories = x));

let matchups = {};
fetch("./matchups.json")
  .then((x) => {
    document.getElementById("lastModified").innerText = x.headers.get("last-modified");
    return x.json();
  })
  .then((x) => (matchups = x));

let extra = {};
fetch("./extra.json")
  .then((x) => x.json())
  .then((x) => (extra = x));

let hermit = {};
fetch("./hermit.json")
  .then((x) => x.json())
  .then((x) => (hermit = x));

const matchups_messages = [];
const goodCharacterTypes = ["townsfolk", "outsider"];

const hiddenMessages = [];

input.onchange = (evt) => {
  if (!window.FileReader) return; // Browser is not compatible

  const reader = new FileReader();
  reader.onload = (evt) => {
    if (evt.target.readyState != 2) return;
    if (evt.target.error) {
      alert("Error while reading file");
      return;
    }

    let filecontent = null;
    try {
      filecontent = JSON.parse(evt.target.result);
    } catch (e) {
      if (e.name == "SyntaxError") {
        alert("Error in file syntax");
      } else {
        throw e;
      }
    }

    console.log(filecontent);
    const characters = filecontent
      .filter((e) => e.id !== "_meta")
      .map((e) => (typeof e === "string" ? e : e.id))
      .map((e) => getFormattedCharacterKey(e))
      .filter((e) => e !== undefined);

    const hermitActive = characters.some((e) => e === "Hermit");
    matchups_messages.length = 0;
    hiddenMessages.length = 0;
    for (const group of groups) {
      const inGroup = group.characters.filter((e) => characters.some((f) => f === e));
      const nonTravellers = inGroup.filter((e) => getCharacterType(e) !== "traveller");
      // Atheist can explain anything, but it will never do something that can't be explained otherwise
      if (nonTravellers.length === 1 && nonTravellers[0] === "Atheist") {
        continue;
      }
      
      const nonTravellerGroupMembers = group.characters.filter((e) => getCharacterType(e) !== "traveller");
      const descriptor = `${group.name.slice(0, 1).toLowerCase()}${group.name.slice(1)}`;
      if (group.recommended && nonTravellers.length === 0) {
        matchups_messages.push(["warning", ["Global"], `No non-Traveller character that ${descriptor}, consider adding one or more of the following: ${nonTravellerGroupMembers.join(", ")}`]);
      }
      if (group.multiple && nonTravellers.length === 1) {
        matchups_messages.push(["warning", ["Global"], `Only one non-Traveller character that ${descriptor} (${nonTravellers[0]}), consider adding one or more of following: ${nonTravellerGroupMembers.filter((e) => e !== nonTravellers[0]).join(", ")}`]);
      }
      if (group.not_only_good && inGroup.length > 0 && inGroup.every((e) => goodCharacterTypes.includes(getCharacterType(e)))) {
        matchups_messages.push(["warning", ["Global"], `No character that ${descriptor} and isn't a Townsfolk or Outsider (${inGroup.join(", ")}), consider adding one or more of following: ${nonTravellerGroupMembers.filter((e) => !goodCharacterTypes.includes(getCharacterType(e))).join(", ")}`]);
      }
      if (inGroup.length > 1) {
        matchups_messages.push(["group", inGroup, group.name]);
      }
    }

    for (const char of characters) {
      for (const [other, messages] of Object.entries(matchups[char])) {
        if (!characters.includes(other)) continue;
        for (const [t, msg] of Object.entries(messages))
          matchups_messages.push([t, [char, other], msg]);
      }
      if (hermitActive && hermit[char]) {
        for (const [other, messages] of Object.entries(hermit[char])) {
          if (!characters.includes(other)) continue;
          for (const [t, msg] of Object.entries(messages))
            matchups_messages.push([t, ["Hermit", char, other], msg]);
        }
      }
    }

    for (const data of extra) {
      let valid = true
      for (const character of data.characters) {
        if (!characters.includes(character)) {
          valid = false;
          break;
        }
      }
      if (valid) {
        for (const [t, msg] of Object.entries(data.interaction)) {
          matchups_messages.push([t, data.characters, msg]);
        }
      }
    }

    printMessages();
  };

  reader.readAsText(evt.target.files[0]);
};

displayTypeInput.onchange = () => { printMessages(); };

function getFormattedCharacterKey(char) {
  for (const key of Object.keys(matchups))
    if (char.toLowerCase().replace(/[_\- ']/g, "") === key.toLowerCase().replace(/[_\- ']/g, "")) return key;

  return undefined;
}

function createDeleteButton(msg) {
  const deleteBtn = document.createElement("b");
  deleteBtn.innerHTML = "X ";
  deleteBtn.style.cursor = "pointer";
  deleteBtn.addEventListener("click", () => {
    hiddenMessages.push(msg);
    printMessages();
  });
  return deleteBtn;
}

function printMessages() {
  const displayType = displayTypeInput.value;
  output.innerHTML = "";

  switch (displayType) {
    case "messageType":
      printMessagesPerType();
      break;
    case "character":
      printMessagesPerCharacter();
      break;
  }
}

function printMessagesPerType() {
  const messages_per_type = {
    info: [],
    good: [],
    great: [],
    warning: [],
    conflict: [],
    group: [],
  };
  for (const [type, chars, msg] of matchups_messages) {
    messages_per_type[type].push([chars, msg]);
  }

  for (const [t, messages] of Object.entries(messages_per_type)) {
    if (!messages.length) continue;

    const title = document.createElement("li");
    title.innerHTML = `<h3>[${capitalizeFirstLetter(t)}] (${messages.length})</h3>`;
    title.style.color = color_per_message_type[t];
    title.style["font-weight"] = "bold";
    output.appendChild(title);

    for (const [chars, msg] of messages) {
      if (hiddenMessages.includes(msg)) {
        continue;
      }

      const elt = document.createElement("li");
      const names = document.createElement("span");
      const message = document.createElement("span");
      if (t === "group") {
        message.innerHTML = msg + ": ";
        message.style.color = color_per_message_type[t];
        names.innerHTML = chars.map((e) => linkify(e, true)).join(', ');

        elt.appendChild(message);
        elt.appendChild(names);
      } else {
        names.innerHTML = chars.map((e) => linkify(e)).join(' + ') + ': ';
        names.style.color = color_per_message_type[t];
        message.innerHTML = msg;
        const deleteBtn = createDeleteButton(msg);
  
        elt.appendChild(deleteBtn);
        elt.appendChild(names);
        elt.appendChild(message);
      }
      output.appendChild(elt);
    }
  }
}

function printMessagesPerCharacter() {
  const messages_per_character = {};
  for (const [type, chars, msg] of matchups_messages) {
    for (const char of chars) {
      if (!messages_per_character[char])
        messages_per_character[char] = {
          info: [],
          good: [],
          great: [],
          warning: [],
          conflict: [],
          group: [],
        };
      messages_per_character[char][type].push([chars, msg]);
    }
  }

  for (const [category, characters] of Object.entries(categories)) {
    const title = document.createElement("li");
    title.innerHTML = `<h2>======== [${capitalizeFirstLetter(category)}s] ========</h2>`;
    title.style.color = color_per_character_type[category];
    title.style["font-weight"] = "bold";
    output.appendChild(title);

    for (const char of characters) {
      if (!messages_per_character[char]) continue;

      const messages_per_type = messages_per_character[char];
      const title = document.createElement("li");

      const addons = [];
      if (messages_per_type.warning.length)
        addons.push(`${messages_per_type.warning.length} warning(s)`);
      if (messages_per_type.conflict.length)
        addons.push(`${messages_per_type.conflict.length} conflict(s)`);

      title.innerHTML = `<h3>[${char}]: ${addons.join(", ")}</h3>`;
      title.style.color = color_per_character_type[category];
      title.style["font-weight"] = "bold";
      output.appendChild(title);

      for (const [type, messages] of Object.entries(messages_per_type)) {
        if (!messages.length) continue;

        for (let [chars, msg] of messages) {
          if (hiddenMessages.includes(msg)) {
            continue;
          }

          const elt = document.createElement("li");
          const names = document.createElement("span");
          const message = document.createElement("span");
          const deleteBtn = createDeleteButton(msg);
          names.innerHTML = chars.map((e) => linkify(e)).join(' + ') + ': ';
          names.style.color = color_per_message_type[type];
          message.innerHTML = msg;

          elt.appendChild(deleteBtn);
          elt.appendChild(names);
          elt.appendChild(message);
          output.appendChild(elt);
        }
      }
    }
  }
}

function getCharacterType(char) {
  for (const [category, characters] of Object.entries(categories)) {
    if (characters.includes(char)) return category;
  }
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function linkify(name, colorByCharacterTypes = false) {
  if (name.toLowerCase() == "global") return name;
  let extra = "";
  if (colorByCharacterTypes) {
    extra = "style=\"color: " + color_per_character_type[getCharacterType(name)] + ";\"";
  }
  return `<a class="bland" href="https://wiki.bloodontheclocktower.com/${name.replace(/ /g, "_")}" target="_blank" ${extra}>${name}</a>`;
}