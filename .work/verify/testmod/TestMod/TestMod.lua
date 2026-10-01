-- TestMod: exercises every declaration kind the importer understands
SMODS.Atlas {
    key = 'mod_jokers',
    path = 'ModJokers.png',
    px = 71,
    py = 95,
}

SMODS.Atlas {
    key = 'mod_notes',
    path = 'ModNotes.png',
    px = 71,
    py = 95,
}

-- a whole new card type with its own collection tab
SMODS.ConsumableType {
    key = 'Musical',
    primary_colour = HEX('ff5f55'),
    secondary_colour = HEX('4bc292'),
    collection_rows = { 5, 5 },
}

SMODS.Joker {
    key = 'alpha',
    atlas = 'mod_jokers',
    pos = { x = 0, y = 0 },
    rarity = 2,
    cost = 5,
    config = { extra = { mult = 10 } },
    effect = 'Gains Mult',
    loc_txt = { name = 'Alpha Joker', text = { 'inline loc_txt works' } },
}

SMODS.Joker {
    key = 'beta',
    atlas = 'mod_jokers',
    pos = { x = 1, y = 0 },
    soul_pos = { x = 0, y = 1 },
    rarity = 4,
    cost = 20,
}

SMODS.Joker {
    key = 'gamma',
    rarity = 1,
    cost = 4,
}

SMODS.Consumable {
    key = 'note_a',
    set = 'Musical',
    atlas = 'mod_notes',
    pos = { x = 0, y = 0 },
    cost = 3,
}

SMODS.Consumable {
    key = 'note_b',
    set = 'Musical',
    atlas = 'tm_mod_notes',
    pos = { x = 1, y = 0 },
    cost = 4,
}

SMODS.Consumable {
    key = 'note_bad',
    set = 'Musical',
    atlas = 'mod_notes',
    pos = { x = 9, y = 9 },
    cost = 4,
}

SMODS.Voucher {
    key = 'ticket',
    atlas = 'mod_notes',
    pos = { x = 0, y = 1 },
    cost = 10,
}

SMODS.Booster {
    key = 'note_pack',
    atlas = 'mod_notes',
    pos = { x = 1, y = 1 },
    cost = 4,
    weight = 1,
    kind = 'musical_pack',
}

SMODS.Back {
    key = 'musical_deck',
    atlas = 'mod_notes',
    pos = { x = 0, y = 1 },
}

SMODS.Blind {
    key = 'encore',
    atlas = 'blind_chips',
    pos = { x = 0, y = 2 },
    boss = { min_ante = 3 },
    dollars = 5,
    mult = 2,
}

SMODS.Tag {
    key = 'refrain',
    atlas = 'tags',
    pos = { x = 1, y = 1 },
}

SMODS.Enhancement {
    key = 'sharp',
    atlas = 'centers',
    pos = { x = 6, y = 4 },
}

SMODS.Sticker {
    key = 'tuned',
    atlas = 'stickers',
    pos = { x = 2, y = 1 },
    badge_colour = HEX('4bc292'),
}

SMODS.Shader {
    key = 'tint',
    path = 'tint.fs',
}

SMODS.Edition {
    key = 'tinted',
    shader = 'tint',
    loc_txt = { name = 'Tinted', text = { 'a mod shader test' } },
}
