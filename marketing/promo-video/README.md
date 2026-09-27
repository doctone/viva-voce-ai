# Viva Voce AI — promotional film

A 75-second launch film. It is built as a deterministic HTML animation (`film.html`),
rendered frame by frame with headless Chromium, then scored with an original
synthesized soundtrack (`score.py`).

| Time | Beat |
| --- | --- |
| 0:00 | A student prompts an AI; a 2,000-word essay appears in eleven seconds. |
| 0:08 | AI detectors disagree with themselves. Honest students get accused. |
| 0:16 | "There is an older test. One you can't outsource. **Ask them.**" |
| 0:24 | Wordmark: *The oral examination, rebuilt for every classroom.* |
| 0:29 | **Prepare** — a submission becomes a 12-question viva across three lines of inquiry. |
| 0:41 | **Conduct** — live recording, transcript, private observations, evidence markers. |
| 0:54 | **Conclude** — the teacher's signed Viva Record and conclusion. |
| 1:02 | Not a detector. Not an AI verdict. A conversation — at scale. |
| 1:09 | *Know what they know.* |

## Watch / preview

Open `film.html` in a browser. It plays in a loop with scrub controls. The page
looks for `score.m4a` next to it for sound.

## Re-render

```sh
cd marketing/promo-video
npm i playwright-core@1.56 && pip install numpy imageio-ffmpeg
python3 score.py                                    # -> score.wav
FFMPEG=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())") \
  node capture.mjs video                            # -> video.mp4 (silent, 1080p30)
$FFMPEG -i video.mp4 -i score.wav -c:v copy -c:a aac -b:a 192k -shortest viva-voce-ai-film.mp4
```

`capture.mjs stills 5 21 46` renders PNG stills at the given timestamps for quick review.
`capture.mjs` launches Chromium from `/opt/pw-browsers`. To use another install,
change `executablePath`.

Fonts (Newsreader, Manrope, JetBrains Mono) are bundled under `fonts/` under the SIL Open Font License.
The student, teacher and essay in the film are fictional.
