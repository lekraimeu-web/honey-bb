// ─────────────────────────────────────────────────────────────────────────────
//  TEXTS YOU CAN EDIT
//  Everything she reads (except the letter, which lives in letter.js)
//  is here. Keep the two required phrases exactly as they are.
// ─────────────────────────────────────────────────────────────────────────────

// The very first words on screen. Do not change.
export const OPENING_WORDS = 'my dear honey bb'

// The very last words of the whole experience. Do not change.
export const FINAL_WORDS = 'Yanis qui t’aime'

export const intro = {
  subtitle: 'I made a small universe for you.',
  hint: 'Put your headphones on, dim the lights, and take your time.',
  button: 'Begin',
}

// The kitten scene in the sunset meadow.
export const meadow = {
  chapter: '✿',
  title: 'A visitor at golden hour',
  collarTag: 'Property of Sera', // text engraved on the kitten's collar tag
  question: 'Do you want to begin, super doudou?',
  yes: 'Yes, of course ♡',
  no: 'No',
  noTeases: ['nope', 'try again', 'too slow', 'hehe', 'nice try', 'no way'],
}

export const universe = {
  chapter: 'I',
  title: 'A sky, just for you',
  hint: 'Touch the heart. It has things to tell you.',
  hintMobile: 'Tap the heart. It has things to tell you.',
  hintLast: 'One more touch.',
  // Each touch of the heart releases one of these. The last touch opens the way.
  heartWords: [
    'You are my calm.',
    'You are my laughter.',
    'You are my favorite thought.',
    'You are my home.',
    'You are my always.',
  ],
}

export const gallery = {
  chapter: 'II',
  title: 'The memories we keep',
  hint: 'Drag or swipe to float between them.',
  continueButton: 'Keep going',
  empty: {
    title: 'Our photos will float here',
    text: 'Drop pictures into the “photos” folder of the project and they appear by themselves.',
  },
}

export const letter = {
  chapter: 'III',
  title: 'A letter for you',
  skipHint: 'tap anywhere to read faster',
  continueButton: 'There is one more thing',
  whisper: 'a star is whispering nearby…',
}

export const secret = {
  chapter: '✦',
  title: 'The constellation of you',
  hint: 'Touch the brightest star.',
  done: 'You were the shape of it all along.',
  continueButton: 'Walk with me to the end',
}

// Lines fade in one after the other on the final screen, before the signature.
export const finaleLines = [
  'Every star up here is one of the ways you make my life brighter.',
  'I did not know a heart could hold this much.',
  'Thank you for being you.',
  'With all of mine,',
]

export const portal = {
  hint: 'touch the light',
}
