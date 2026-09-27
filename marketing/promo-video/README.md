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

## Watch

The finished film lives with the site's static assets at
`apps/web/public/media/viva-voce-ai-film.mp4` (1920 × 1080, 30 fps, H.264 + AAC, 1:15).
The landing page plays it through `/film.mp4`, a route that serves the file in byte
ranges so it plays on iPhone and iPad (see `apps/web/src/routes/film[.]mp4.ts`).

To preview the animation live, open `film.html` in a browser. It loops and has
scrub controls. For sound it needs `score.m4a` next to it (see below).

## Re-render

```sh
cd marketing/promo-video
npm i playwright-core@1.56
pip install numpy imageio-ffmpeg
export FFMPEG=$(python3 -c "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())")
MEDIA=../../apps/web/public/media

python3 score.py            # original score -> score.wav
node capture.mjs video      # silent picture -> video.mp4
$FFMPEG -y -i video.mp4 -i score.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k \
  -shortest -movflags +faststart $MEDIA/viva-voce-ai-film.mp4
# The landing page's poster is the film's opening hook, 7 seconds in.
$FFMPEG -y -ss 7.0 -i $MEDIA/viva-voce-ai-film.mp4 -frames:v 1 -vf scale=1600:-2 -q:v 3 \
  $MEDIA/viva-voce-ai-film-poster.jpg
$FFMPEG -y -i score.wav -c:a aac -b:a 192k score.m4a    # sound for the live preview
```

The landing page's chapter links and text version (`apps/web/src/components/LandingFilm.tsx`)
quote the film's timings and on-screen words, so update them alongside any re-cut.

The film and the score share one timeline (seconds), so a change to a scene's timing in
`film.html` needs the matching cue moved in `score.py`.

`node capture.mjs stills 5 21 46` renders PNG stills at the given timestamps into `stills/`
(create the folder first) for quick review.
`capture.mjs` launches Chromium from `/opt/pw-browsers`. To use another install,
change `executablePath`.

Fonts (Newsreader, Manrope, JetBrains Mono) are bundled under `fonts/` under the SIL Open Font License.
The student, teacher and essay in the film are fictional.
