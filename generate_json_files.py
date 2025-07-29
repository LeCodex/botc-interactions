import csv
import json
import requests

def extract_messages(row):
    messages = {}
    categories = {"??": "great", "!!": "conflict", "?": "good", "!": "warning", "@": "group" }

    for k, v in row.items():
        print("  " + k)
        if v == "" or v == ".": continue
        messages[k] = {}

        # Separate the string in the different messages
        partitions: list[str] = [v]
        for separator in categories.keys():
            new_partitions = []
            
            for part in partitions:
                if part in categories.keys(): # The partition is a separator: ignore it
                    new_partitions.append(part)
                    continue

                new_partitions.extend(part.partition(separator))

            partitions = new_partitions

        partitions = [v.strip() for v in partitions if v != ""] # Filter out the empty strings
        
        # If no symbols: it's just an info
        if len(partitions) == 1:
            messages[k]["info"] = partitions.pop(0)

        # Otherwise, add each message in its category
        while len(partitions):
            symbol = partitions.pop(0)
            messages[k][categories[symbol]] = partitions.pop(0)

    return messages

def extract_groups(row: list[str]):
    return {
        "name": row.pop(0),
        "recommended": row.pop(0) == "TRUE",
        "multiple": row.pop(0) == "TRUE",
        "evil_or_fabled": row.pop(0) == "TRUE",
        "characters": [x for x in row if len(x) > 0]
    }

outputs = {}
for tab in ["Matchups", "Hermit"]:
    response = requests.get(f"https://docs.google.com/spreadsheets/d/1KBF5DurN0zq8eSLuh3u2Lg2w7e6Fr7N4B5qzc-wRO4U/gviz/tq?tqx=out:csv&sheet={tab}")
    reader = csv.DictReader(response.text.split("\n"))
    output = {}
    for row in reader:
        key = row.pop("")
        print(key)
        output[key] = extract_messages(row)
    outputs[tab] = output

for tab in ["Groups"]:
    response = requests.get(f"https://docs.google.com/spreadsheets/d/1KBF5DurN0zq8eSLuh3u2Lg2w7e6Fr7N4B5qzc-wRO4U/gviz/tq?tqx=out:csv&sheet={tab}")
    reader = csv.reader(response.text.split("\n")[1:])  # Skip header
    output = []
    for row in reader:
        output.append(extract_groups(row))
    outputs[tab] = output

for name, output in outputs.items():
    json_filename = f"./{tab.lower()}.json"
    with open(json_filename, "w") as file:
        json.dump(output, fp=file, ensure_ascii=False, indent=4)