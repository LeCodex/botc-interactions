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
fetch("./groups.json")
  .then((x) => x.json())
  .then((x) => (groups = x));

let matchups = {};
fetch("./matchups.json")
  .then((x) => {
    document.getElementById("lastModified").innerText = x.headers.get("last-modified");
    return x.json();
  })
  .then((x) => (matchups = x));

let hermit = {};
fetch("./hermit.json")
  .then((x) => x.json())
  .then((x) => (hermit = x));

const matchups_messages = [];

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
        alert("Error while parsing file");
      } else {
        throw e;
      }
    }

    console.log(filecontent);
    const characters = filecontent
      .filter((e) => e.id !== "_meta")
      .map((e) => (typeof e === "string" ? e : e.id));

    const hermitActive = characters.some((e) => getFormattedCharacterKey(e) === "hermit");
    matchups_messages.length = 0;
    for (const char of characters) {
      const key = getFormattedCharacterKey(char);
      if (!key) continue;
      for (const [other, messages] of Object.entries(matchups[key])) {
        if (!characters.includes(other.replace(/[_\-]/g, ""))) continue;
        for (const [t, msg] of Object.entries(messages))
          matchups_messages.push([t, [key, other], msg]);
      }
      if (hermitActive && hermit[key]) {
        for (const [other, messages] of Object.entries(hermit[key])) {
          if (!characters.includes(other.replace(/[_\-]/g, ""))) continue;
          for (const [t, msg] of Object.entries(messages))
            matchups_messages.push([t, ["hermit", key, other], msg]);
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
    if (char.replace(/[_\-]/g, "") === key.replace(/[_\-]/g, "")) return key;

  return undefined;
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
    error: [],
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

    if (t === "group") {
      const characters_per_group = {};
      for (const [chars, msg] of messages) {
        characters_per_group[msg] ??= new Set();
        for (const char of chars) {
          characters_per_group[msg].add(char);
        }
      }
      for (const [msg, chars] of Object.entries(characters_per_group)) {
        const elt = document.createElement("li");
        const message = document.createElement("span");
        const names = document.createElement("span");
        message.innerHTML = msg + ": ";
        message.style.color = color_per_message_type[t];
        names.innerHTML = [...chars].map(formatCharacterName).join(', ');
  
        elt.appendChild(message);
        elt.appendChild(names);
        output.appendChild(elt);
      }
    } else {
      for (const [chars, msg] of messages) {
        const elt = document.createElement("li");
        const names = document.createElement("span");
        const message = document.createElement("span");
        names.innerHTML = chars.map(formatCharacterName).join(' + ') + ': ';
        names.style.color = color_per_message_type[t];
        message.innerHTML = msg;
  
        elt.appendChild(names);
        elt.appendChild(message);
        output.appendChild(elt);
      }
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
          error: [],
          group: [],
        };
      messages_per_character[char][type].push([chars, msg]);
    }
  }

  for (const [group, characters] of Object.entries(groups)) {
    const title = document.createElement("li");
    title.innerHTML = `<h2>======== [${capitalizeFirstLetter(group.slice(1))}s] ========</h2>`;
    title.style.color = color_per_character_type[group.slice(1)];
    title.style["font-weight"] = "bold";
    output.appendChild(title);

    for (const char of characters) {
      if (!messages_per_character[char]) continue;

      const messages_per_type = messages_per_character[char];
      const title = document.createElement("li");

      const addons = [];
      if (messages_per_type.warning.length)
        addons.push(`${messages_per_type.warning.length} warning(s)`);
      if (messages_per_type.error.length)
        addons.push(`${messages_per_type.error.length} error(s)`);

      title.innerHTML = `<h3>[${formatCharacterName(char)}]: ${addons.join(", ")}</h3>`;
      title.style.color = color_per_character_type[group.slice(1)];
      title.style["font-weight"] = "bold";
      output.appendChild(title);

      for (const [type, messages] of Object.entries(messages_per_type)) {
        if (!messages.length) continue;

        for (let [chars, msg] of messages) {
          const elt = document.createElement("li");
          const names = document.createElement("span");
          const message = document.createElement("span");
          names.innerHTML = chars.map(formatCharacterName).join(' + ') + ': ';
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
  for (const [type, characters] of Object.entries(groups)) {
    if (characters.includes(char)) return type.slice(1);
  }
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function formatCharacterName(name) {
  return name
    .split("_")
    .map(capitalizeFirstLetter)
    .join(" ");
}
