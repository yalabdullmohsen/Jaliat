import asyncio, json, os, edge_tts
L = json.load(open("lines.json"))
VOICES = {"fahed":"ar-KW-FahedNeural","hamed":"ar-SA-HamedNeural","hamdan":"ar-AE-HamdanNeural"}
async def main():
    for vk, v in VOICES.items():
        os.makedirs(f"out/{vk}", exist_ok=True)
        for k, t in L:
            for i in range(4):
                try:
                    await edge_tts.Communicate(t, v, rate="+12%", pitch="+0Hz").save(f"out/{vk}/{k}.mp3"); break
                except Exception as e: print("retry", vk, k, e); await asyncio.sleep(3)
asyncio.run(main())
