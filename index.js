// Code written by Le Codex. Check me out on Github!

const input = document.getElementById("scriptUpload");
const output = document.getElementById("returnList");
const displayTypeInput = document.getElementById("displayTypeInput");

const color_per_message_type = {
  info: "",
  good: "lime",
  great: "aqua",
  warning: "yellow",
  error: "red",
  group: "Orchid",
};
const color_per_character_type = {
  townsfolk: "RoyalBlue",
  outsider: "aqua",
  minion: "orange",
  demon: "red",
  traveller: "DarkOrchid",
};

let groups = {};
window
  .fetch("./groups.json")
  .then((x) => x.json())
  .then((x) => (groups = x));

let matchups = {};
window
  .fetch("./matchups.json")
  .then((x) => {
    document.getElementById("lastModified").innerText = x.headers.get("last-modified");
    return x.json();
  })
  .then((x) => (matchups = x));

let matchups_messages = [];

input.onchange = (evt) => {
  if (!window.FileReader) return; // Browser is not compatible

  let reader = new FileReader();
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
        alert("Error while parsing file");
      } else {
        throw e;
      }
    }

    console.log(filecontent);
    let characters = filecontent
      .filter((e) => e.id !== "_meta")
      .map((e) => (typeof e === "string" ? e : e.id));

    matchups_messages = [];
    for (const char of characters) {
      const key = getFormattedCharacterKey(char);
      if (!key) continue;
      for (const [other, messages] of Object.entries(matchups[key])) {
        if (!characters.includes(other.replace(/[_\-]/g, ""))) continue;
        for (const [t, msg] of Object.entries(messages))
          matchups_messages.push([t, key, other, msg]);
      }
    }

    printMessages();
  };

  reader.readAsText(event.target.files[0]);
};

displayTypeInput.onchange = () => { printMessages(); };

function getFormattedCharacterKey(char) {
  for (const key of Object.keys(matchups))
    if (char.replace(/[_\-]/g, "") === key.replace(/[_\-]/g, "")) return key;

  return undefined;
}

function printMessages() {
  let displayType = displayTypeInput.value;
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
  let messages_per_type = {
    info: [],
    good: [],
    great: [],
    warning: [],
    error: [],
    group: [],
  };
  for (let [type, char, other, msg] of matchups_messages) {
    messages_per_type[type].push([char, other, msg]);
  }

  for (let [t, messages] of Object.entries(messages_per_type)) {
    if (!messages.length) continue;

    let title = document.createElement("li");
    title.innerHTML = `<h3>[${capitalizeFirstLetter(t)}] (${messages.length})</h3>`;
    title.style.color = color_per_message_type[t];
    title.style["font-weight"] = "bold";
    output.appendChild(title);

    for (let [char, other, msg] of messages) {
      let elt = document.createElement("li");
      let names = document.createElement("span");
      let message = document.createElement("span");
      names.innerHTML = `${formatCharacterName(char)} + ${formatCharacterName(
        other
      )}: `;
      names.style.color = color_per_message_type[t];
      message.innerHTML = msg;

      elt.appendChild(names);
      elt.appendChild(message);
      output.appendChild(elt);
    }
  }
}

function printMessagesPerCharacter() {
  let messages_per_character = {};
  for (let [type, char, other, msg] of matchups_messages) {
    if (!messages_per_character[char])
      messages_per_character[char] = {
        info: [],
        good: [],
        great: [],
        warning: [],
        error: [],
        group: [],
      };
    messages_per_character[char][type].push([other, msg]);

    if (!messages_per_character[other])
      messages_per_character[other] = {
        info: [],
        good: [],
        great: [],
        warning: [],
        error: [],
        group: [],
      };
    messages_per_character[other][type].push([char, msg]);
  }

  for (let [group, characters] of Object.entries(groups)) {
    let title = document.createElement("li");
    title.innerHTML = `<h2>======== [${capitalizeFirstLetter(group.slice(1))}s] ========</h2>`;
    title.style.color = color_per_character_type[group.slice(1)];
    title.style["font-weight"] = "bold";
    output.appendChild(title);

    for (let char of characters) {
      if (!messages_per_character[char]) continue;

      let messages_per_type = messages_per_character[char];
      let title = document.createElement("li");

      let addons = [];
      if (messages_per_type.warning.length)
        addons.push(`${messages_per_type.warning.length} warning(s)`);
      if (messages_per_type.error.length)
        addons.push(`${messages_per_type.error.length} error(s)`);

      title.innerHTML = `<h3>[${formatCharacterName(char)}]: ${addons.join(", ")}</h3>`;
      title.style.color = color_per_character_type[group.slice(1)];
      title.style["font-weight"] = "bold";
      output.appendChild(title);

      for (let [type, messages] of Object.entries(messages_per_type)) {
        if (!messages.length) continue;

        for (let [other, msg] of messages) {
          let elt = document.createElement("li");
          let names = document.createElement("span");
          let message = document.createElement("span");
          names.innerHTML = `${formatCharacterName(
            char
          )} + ${formatCharacterName(other)}: `;
          names.style.color = color_per_message_type[type];
          message.innerHTML = msg;

          elt.appendChild(names);
          elt.appendChild(message);
          output.appendChild(elt);
        }
      }
    }
  }
}

function getCharacterType(char) {
  for (let [type, characters] of Object.entries(groups)) {
    if (characters.includes(char)) return type.slice(1);
  }
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function formatCharacterName(name) {
  return name
    .split("_")
    .map((e) => capitalizeFirstLetter(e))
    .join(" ");
}
