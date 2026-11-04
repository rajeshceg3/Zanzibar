---- MODULE Zanzibar ----
EXTENDS Integers

VARIABLES chapter, meeting, notes, sound, paused
vars == <<chapter, meeting, notes, sound, paused>>

Chapters == 0..3
KindOf(c) ==
  CASE c = 0 -> "dhow"
    [] c = 1 -> "door"
    [] c = 2 -> "colobus"
    [] c = 3 -> "tide"

Init ==
  /\ chapter = 0
  /\ meeting = "none"
  /\ notes = FALSE
  /\ sound = FALSE
  /\ paused \in BOOLEAN

YouChooseAChapter(n) ==
  /\ ~notes
  /\ n # chapter
  /\ chapter' = n
  /\ meeting' = "none"
  /\ UNCHANGED <<notes, sound, paused>>

YouMoveOn ==
  /\ ~notes
  /\ chapter' = (chapter + 1) % 4
  /\ meeting' = "none"
  /\ UNCHANGED <<notes, sound, paused>>

YouDriftBack ==
  /\ ~notes
  /\ chapter' = (chapter + 3) % 4
  /\ meeting' = "none"
  /\ UNCHANGED <<notes, sound, paused>>

YouFollowTheInvitation ==
  /\ ~notes
  /\ meeting = "none"
  /\ meeting' = KindOf(chapter)
  /\ UNCHANGED <<chapter, notes, sound, paused>>

YouTapTheSubject ==
  /\ ~notes
  /\ meeting = "none"
  /\ meeting' = KindOf(chapter)
  /\ UNCHANGED <<chapter, notes, sound, paused>>

YouReturnToTheIsland ==
  /\ meeting # "none"
  /\ meeting' = "none"
  /\ UNCHANGED <<chapter, notes, sound, paused>>

YouOpenTheNotes ==
  /\ ~notes
  /\ meeting = "none"
  /\ notes' = TRUE
  /\ UNCHANGED <<chapter, meeting, sound, paused>>

YouCloseTheNotes ==
  /\ notes
  /\ notes' = FALSE
  /\ UNCHANGED <<chapter, meeting, sound, paused>>

YouToggleTheMusic ==
  /\ sound' = ~sound
  /\ UNCHANGED <<chapter, meeting, notes, paused>>

YouToggleTheMotion ==
  /\ paused' = ~paused
  /\ UNCHANGED <<chapter, meeting, notes, sound>>

Next ==
  \/ \E n \in Chapters : YouChooseAChapter(n)
  \/ YouMoveOn \/ YouDriftBack
  \/ YouFollowTheInvitation \/ YouTapTheSubject \/ YouReturnToTheIsland
  \/ YouOpenTheNotes \/ YouCloseTheNotes
  \/ YouToggleTheMusic \/ YouToggleTheMotion

Spec == Init /\ [][Next]_vars

AlwaysInAChapter == chapter \in Chapters
EncounterBelongsToChapter == meeting # "none" => meeting = KindOf(chapter)
NotesFreezeTheWorld == notes => meeting = "none"
====
