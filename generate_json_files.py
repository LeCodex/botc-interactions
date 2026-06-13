import csv
import json
import requests
from typing import Any

def extract_messages(row):
    messages = {}

    for k, v in row.items():
        if v == "" or v == ".": continue
        messages[k] = parse_interaction(v)

    return messages

categories = {"??": "great", "!!": "conflict", "?": "good", "!": "warning", "@": "group"}
def parse_interaction(input: str):
    # Separate the string in the different messages
    messages = {}
    partitions: list[str] = [input]

    for separator in categories.keys():
        new_partitions = []
        
        for part in partitions:
            if part in categories.keys():  # The partition is a separator: ignore it
                new_partitions.append(part)
                continue

            new_partitions.extend(part.partition(separator))

        partitions = new_partitions

    partitions = [x.strip(" .") for x in partitions if len(x) > 0]  # Filter out the empty strings

    # Start with no symbols: it's an info
    if not any(partitions[0] == x for x in categories.keys()):
        messages["info"] = partitions.pop(0)

    # Add each message in its category
    while len(partitions):
        symbol = partitions.pop(0)
        messages[categories[symbol]] = partitions.pop(0)

    return messages

def extract_groups(row: list[str]):
    return {
        "name": row.pop(0),
        "recommended": row.pop(0) == "TRUE",
        "multiple": row.pop(0) == "TRUE",
        "not_only_good": row.pop(0) == "TRUE",
        "characters": [x for x in row if len(x) > 0]
    }

def extract_extras(row: list[str]):
    return {
        "interaction": parse_interaction(row.pop(0)),
        "characters": [x for x in row if len(x) > 0]
    }

def alphabetical_path(path: str | None, k: str):
    return (
        k if path is None else (
            f"{path}.{k}" if path < k else f"{k}.{path}"
        ) if "." not in path else
        f"{path}.{k}"
    )

def recursive_diff(a: dict, b: dict, path: str | None = None, diffs: dict[str, tuple[Any | None, Any | None]] = {}):
    for k, v in a.items():
        full_path = alphabetical_path(path, k)
        if k not in b:
            if type(v) == dict:
                recursive_diff(v, {}, full_path)
            else:
                diffs[full_path] = (v, diffs[full_path][1] if full_path in diffs else None)
            continue

        other = b[k]
        if type(v) == dict and type(other) == dict:
            recursive_diff(v, other, full_path)
        elif v != other:
            diffs[full_path] = (v, other)

    for k, v in b.items():
        full_path = alphabetical_path(path, k)
        if k not in a:
            if type(v) == dict:
                recursive_diff({}, v, full_path)
            else:
                diffs[full_path] = (diffs[full_path][0] if full_path in diffs else None, v)
            continue

    if path is None:
        for subpath, (minus, plus) in diffs.items():
            if minus == plus: continue
            print(f"\033[1m{subpath}:\033[00m")
            if minus: print(f"\t\033[91m- {minus}\033[00m")
            if plus: print(f"\t\033[92m+ {plus}\033[00m")


outputs = {}
base_url = "https://docs.google.com/spreadsheets/d/1KBF5DurN0zq8eSLuh3u2Lg2w7e6Fr7N4B5qzc-wRO4U/gviz/tq?tqx=out:csv"
for tab in ["Matchups", "Hermit"]:
    response = requests.get(f"{base_url}&sheet={tab}")
    reader = csv.DictReader(response.text.split("\n"))
    output = {}
    for row in reader:
        key = row.pop("")
        output[key] = extract_messages(row)

    try:
        json_filename = f"./{tab.lower()}.json"
        with open(json_filename, "r") as file:
            existing = json.load(file)
            recursive_diff(existing, output)
        input("Press Enter to continue")
    except:
        pass

    outputs[tab] = output

for tab in ["Groups"]:
    response = requests.get(f"{base_url}&sheet={tab}")
    reader = csv.reader(response.text.split("\n")[1:])  # Skip header
    output = []
    for row in reader:
        output.append(extract_groups(row))
    outputs[tab] = output

for tab in ["Extra"]:
    response = requests.get(f"{base_url}&sheet={tab}")
    reader = csv.reader(response.text.split("\n"))
    output = []
    for row in reader:
        output.append(extract_extras(row))
    outputs[tab] = output

for name, output in outputs.items():
    json_filename = f"./{name.lower()}.json"
    print(f"printing {json_filename}")
    with open(json_filename, "w") as file:
        json.dump(output, fp=file, ensure_ascii=False, indent=4)
