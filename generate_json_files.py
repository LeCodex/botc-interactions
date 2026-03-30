import csv
import json
import requests

def extract_messages(row):
    messages = {}

    for k, v in row.items():
        print("  " + k)
        if v == "" or v == ".": continue
        messages[k] = parse_interaction(v)

    return messages

categories = {"??": "great", "!!": "conflict", "?": "good", "!": "warning", "@": "group" }
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
    
    # If no symbols: it's just an info
    if len(partitions) == 1:
        messages["info"] = partitions.pop(0)

    # Otherwise, add each message in its category
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

outputs = {}
base_url = "https://docs.google.com/spreadsheets/d/1KBF5DurN0zq8eSLuh3u2Lg2w7e6Fr7N4B5qzc-wRO4U/gviz/tq?tqx=out:csv"
for tab in ["Matchups", "Hermit"]:
    response = requests.get(f"{base_url}&sheet={tab}")
    reader = csv.DictReader(response.text.split("\n"))
    output = {}
    for row in reader:
        key = row.pop("")
        print(key)
        output[key] = extract_messages(row)
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
