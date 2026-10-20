import asyncio, json, os, edge_tts
L = json.load(open("lines.json"))
VOICES = {"v5hamdan":"ar-AE-HamdanNeural","v5moaz":"ar-QA-MoazNeural","v5ali":"ar-BH-AliNeural","v5abdullah":"ar-OM-AbdullahNeural","v5taim":"ar-JO-TaimNeural","v5shakir":"ar-EG-ShakirNeural","v5andrew":"en-US-AndrewMultilingualNeural","v5brian":"en-US-BrianMultilingualNeural"}
async def main():
    for vk, v in VOICES.items():
        os.makedirs(f"out/{vk}", exist_ok=True)
        for k, t in L:
            for i in range(4):
                try:
                    await edge_tts.Communicate(t, v, rate="+22%", pitch="+0Hz").save(f"out/{vk}/{k}.mp3"); break
                except Exception as e: print("retry", vk, k, e); await asyncio.sleep(3)
asyncio.run(main())
