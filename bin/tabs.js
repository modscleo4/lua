const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

console.log(randomBetween(1, 5 * 10**5));
Array(60).fill(0).map(v => randomBetween(1, 2**60)).forEach(v => {
    console.log(v);
});
Array(60).fill(0).map(v => randomBetween(1, 2**60)).forEach(v => {
    console.log(v);
});

function getChordNotes(chord) {
    const { Note, Chord, Octave } = chord.match(/^(?<Note>[A-G][#b]?)(?<Chord>[ms]?)(?<Octave>\d*)$/)?.groups ?? {};

    const i = Note.includes('b') ? (notes.indexOf(Note.replace('b', '')) - 1) % 12 : notes.indexOf(Note);
    const chordNotes = [notes[i], Chord === 'm' ? notes[(i + 3) % 12] : notes[(i + 4) % 12], notes[(i + 7) % 12]];
    return chordNotes;
}

console.log(getChordNotes('C5'));
console.log(getChordNotes('Ab5'));
console.log(getChordNotes('G5'));

const bassTuning = ['G2', 'D2', 'A1', 'E1'];

const bassNotes = [
    Array(24 + 1).fill(''),
    Array(24 + 1).fill(''),
    Array(24 + 1).fill(''),
    Array(24 + 1).fill(''),
    //Array(24 + 1).fill(''),
    //Array(24 + 1).fill(''),

    // ┌──────┬───────┬──────┬───────┬───────┬──────┬───────┬──────┬───────┬───────┬───────┬───────┬──────┬───────┬──────┬───────┬───────┬──────┬───────┬──────┬───────┬───────┬───────┬───────┬──────┐
    // │ 'E3' │ 'D#3' │ 'D3' │ 'C#3' │ 'C3'  │ 'B2' │ 'A#2' │ 'A2' │ 'G#2' │ 'G2'  │ 'F#2' │ 'F2'  │ 'E2' │ 'D#2' │ 'D2' │ 'C#2' │ 'C2'  │ 'B1' │ 'A#1' │ 'A1' │ 'G#1' │ 'G1'  │ 'F#1' │ 'F1'  │ 'E1' │
    // │ 'A3' │ 'G#3' │ 'G3' │ 'F#3' │ 'F3'  │ 'E3' │ 'D#3' │ 'D3' │ 'C#3' │ 'C3'  │ 'B2'  │ 'A#2' │ 'A2' │ 'G#2' │ 'G2' │ 'F#2' │ 'F2'  │ 'E2' │ 'D#2' │ 'D2' │ 'C#2' │ 'C2'  │ 'B1'  │ 'A#1' │ 'A1' │
    // │ 'D4' │ 'C#4' │ 'C4' │ 'B3'  │ 'A#3' │ 'A3' │ 'G#3' │ 'G3' │ 'F#3' │ 'F3'  │ 'E3'  │ 'D#3' │ 'D3' │ 'C#3' │ 'C3' │ 'B2'  │ 'A#2' │ 'A2' │ 'G#2' │ 'G2' │ 'F#2' │ 'F2'  │ 'E2'  │ 'D#2' │ 'D2' │
    // │ 'G4' │ 'F#4' │ 'F4' │ 'E4'  │ 'D#4' │ 'D4' │ 'C#4' │ 'C4' │ 'B3'  │ 'A#3' │ 'A3'  │ 'G#3' │ 'G3' │ 'F#3' │ 'F3' │ 'E3'  │ 'D#3' │ 'D3' │ 'C#3' │ 'C3' │ 'B2'  │ 'A#2' │ 'A2'  │ 'G#2' │ 'G2' │
    // └──────┴───────┴──────┴───────┴───────┴──────┴───────┴──────┴───────┴───────┴───────┴───────┴──────┴───────┴──────┴───────┴───────┴──────┴───────┴──────┴───────┴───────┴───────┴───────┴──────┘
];

for (let i = 0; i < bassTuning.length; i++) {
    const {Note, Octave} = bassTuning[i].match(/^(?<Note>[A-G][#b]?)(?<Octave>\d*)$/)?.groups ?? {};
    const j = Note.includes('b') ? (notes.indexOf(Note.replace('b', '')) - 1) % 12 : notes.indexOf(Note);
    const octave = parseInt(Octave);

    for (let k = 0; k < bassNotes[i].length; k++) {
        const note = notes[(j + k) % 12];
        const noteOctave = octave + Math.floor((j + k) / 12);

        bassNotes[bassTuning.length - i - 1][bassNotes[i].length - k - 1] = note + noteOctave;
    }
}

//B|--------8-6-6-4-4-4-3~---3-3-3-4-3-3-4-------------------|
//G|--5-5-5--------------------------------4-5---------------|

// C2 C2 C2 G2 F2 F2 D#2 D#2 D#2 D2     D2 D2 D2 D#2 D2 D2 D#2 B1 C2

// D5 D5 D#5 D5 C5 D5 G4     C5 A#4 G# A#4 C5   C5 C5 D5 C5 A#4 C5 D5   A#4 G4 G4 A#4 G4  D5 D5 D#5 D5 C5 A#4 D5 C5 D5 G4 G4 A#4 A4 A4  D5 D5 A#4


// E
// A
// D
// G 7 7 8 7 5 7 0   5 3 0 3 5   5 5 7 5 3 5 7    3 0 0 3 0   7 7 8 7 5 3 7 5 7 0 0 3 2 2 7 7 3


// E
// A
// D
// G

console.table(bassNotes);
