/* ============================================================================
 * Balatro 素材图鉴 — 全美术资源查看 / 预览 / 提取器
 * 数据与贴图全部内联，离线双击即可运行。
 * ==========================================================================*/
'use strict';
(function () {

/* __JOKER_RULES_BEGIN__ */
/* 小丑牌在计分时的规则，从游戏自己的 card.lua 抽出来（.work/gen-rules.js）。
   k：yes=条件简单可自动 / by-card=按打出的每张牌判定 / repeat=增加重复次数 / manual=依赖运行时状态，需手填
   e：效果字段，chip_mod/mult_mod/Xmult_mod 是主结算，chips/mult/x_mult 是逐牌结算 */
const JOKER_RULES = {"source":"card.lua Card:calculate_joker（由 .work/gen-rules.js 生成，勿手改）","regions":{"individual":[3065,3341],"repetition":[3342,3395],"other_joker":[3396,4061],"main":[3631,4059]},"generic":[{"id":"type_x_mult","when":"x_mult>1","effect":"x_mult"},{"id":"type_add_mult","when":"t_mult>0","effect":"t_mult"},{"id":"type_add_chips","when":"t_chips>0","effect":"t_chips"},{"id":"suit_add_mult","when":"effect=='Suit Mult'","effect":"suit.s_mult","suit":"suit.suit"}],"rules":[{"n":"Lucky Cat","k":"by-card","r":"individual","c":"context.other_card.lucky_trigger and not context.blueprint","e":["x_mult=self.ability.x_mult + self.ability.extra"]},{"n":"Wee Joker","k":"yes","r":"main","c":"","e":["chip_mod=self.ability.extra.chips"]},{"n":"Photograph","k":"manual","r":"individual","c":"","e":["x_mult=self.ability.extra"]},{"n":"The Idol","k":"manual","r":"individual","c":"context.other_card:get_id() == G.GAME.current_round.idol_card.id and context.other_card:is_suit(G.GAME.current_round.idol_card.suit)","e":["x_mult=self.ability.extra","chips=self.ability.extra","mult=self.ability.extra","chips=self.ability.extra.chips"]},{"n":"Scary Face","k":"manual","r":"individual","c":"( context.other_card:is_face())","e":["chips=self.ability.extra","mult=self.ability.extra","chips=self.ability.extra.chips","mult=self.ability.extra.mult"]},{"n":"Smiley Face","k":"manual","r":"individual","c":"( context.other_card:is_face())","e":["mult=self.ability.extra","chips=self.ability.extra.chips","mult=self.ability.extra.mult","chips=self.ability.extra.chips"]},{"n":"Golden Ticket","k":"manual","r":"individual","c":"context.other_card.ability.name == 'Gold Card'","e":["chips=self.ability.extra.chips","mult=self.ability.extra.mult","chips=self.ability.extra.chips","mult=self.ability.extra.mult"]},{"n":"Scholar","k":"by-card","r":"individual","c":"context.other_card:get_id() == 14","e":["chips=self.ability.extra.chips","mult=self.ability.extra.mult","chips=self.ability.extra.chips","mult=self.ability.extra.mult"]},{"n":"Walkie Talkie","k":"by-card","r":"individual","c":"(context.other_card:get_id() == 10 or context.other_card:get_id() == 4)","e":["chips=self.ability.extra.chips","mult=self.ability.extra.mult"]},{"n":"Business Card","k":"manual","r":"individual","c":"context.other_card:is_face() and pseudorandom('business') < G.GAME.probabilities.normal/self.ability.extra","e":["mult=self.ability.extra"]},{"n":"Fibonacci","k":"by-card","r":"individual","c":"( context.other_card:get_id() == 2 or context.other_card:get_id() == 3 or context.other_card:get_id() == 5 or context.other_card:get_id() == 8 or context.other_card:get_id() == 14)","e":["mult=self.ability.extra"]},{"n":"Even Steven","k":"by-card","r":"individual","c":"context.other_card:get_id() <= 10 and context.other_card:get_id() >= 0 and context.other_card:get_id()%2 == 0","e":["mult=self.ability.extra"]},{"n":"Odd Todd","k":"by-card","r":"individual","c":"((context.other_card:get_id() <= 10 and context.other_card:get_id() >= 0 and context.other_card:get_id()%2 == 1) or (context.other_card:get_id() == 14))","e":["chips=self.ability.extra"]},{"n":"Onyx Agate","k":"by-card","r":"individual","c":"context.other_card:is_suit(\"Clubs\")","e":["mult=self.ability.extra"]},{"n":"Arrowhead","k":"by-card","r":"individual","c":"context.other_card:is_suit(\"Spades\")","e":["chips=self.ability.extra"]},{"n":"Ancient Joker","k":"by-card","r":"individual","c":"context.other_card:is_suit(G.GAME.current_round.ancient_card.suit)","e":["x_mult=self.ability.extra"]},{"n":"Triboulet","k":"manual","r":"individual","c":"(context.other_card:get_id() == 12 or context.other_card:get_id() == 13)","e":["x_mult=self.ability.extra","mult=13","x_mult=self.ability.extra"]},{"n":"Shoot the Moon","k":"by-card","r":"individual","c":"context.other_card:get_id() == 12","e":["mult=13"]},{"n":"Baron","k":"by-card","r":"individual","c":"context.other_card:get_id() == 13","e":["x_mult=self.ability.extra"]},{"n":"Raised Fist","k":"manual","r":"individual","c":"","e":["mult=2*temp_Mult"]},{"n":"Baseball Card","k":"yes","r":"other_joker","c":"context.other_joker.config.center.rarity == 2 and self ~= context.other_joker","e":["Xmult_mod=self.ability.extra"]},{"n":"Spare Trousers","k":"yes","r":"main","c":"self.ability.mult > 0","e":["mult_mod=self.ability.mult"]},{"n":"Square Joker","k":"yes","r":"main","c":"","e":["chip_mod=self.ability.extra.chips"]},{"n":"Runner","k":"yes","r":"main","c":"","e":["chip_mod=self.ability.extra.chips"]},{"n":"Vampire","k":"manual","r":"other_joker","c":"not context.blueprint","e":["x_mult=self.ability.x_mult + self.ability.extra*#enhanced"]},{"n":"Ride the Bus","k":"yes","r":"main","c":"self.ability.mult > 0","e":["mult_mod=self.ability.mult"]},{"n":"Obelisk","k":"manual","r":"other_joker","c":"not context.blueprint","e":["x_mult=1","x_mult=self.ability.x_mult + self.ability.extra"]},{"n":"Green Joker","k":"yes","r":"main","c":"self.ability.mult > 0","e":["mult_mod=self.ability.mult"]},{"n":"Ice Cream","k":"yes","r":"main","c":"","e":["chip_mod=self.ability.extra.chips"]},{"n":"Loyalty Card","k":"manual","r":"main","c":"","e":["Xmult_mod=self.ability.extra.Xmult","Xmult_mod=self.ability.extra.Xmult"]},{"n":"Half Joker","k":"yes","r":"main","c":"#context.full_hand <= self.ability.extra.size","e":["mult_mod=self.ability.extra.mult"]},{"n":"Abstract Joker","k":"manual","r":"main","c":"","e":["mult_mod=x*self.ability.extra"]},{"n":"Acrobat","k":"yes","r":"main","c":"G.GAME.current_round.hands_left == 0","e":["Xmult_mod=self.ability.extra"]},{"n":"Mystic Summit","k":"yes","r":"main","c":"G.GAME.current_round.discards_left == self.ability.extra.d_remaining","e":["mult_mod=self.ability.extra.mult"]},{"n":"Misprint","k":"yes","r":"main","c":"","e":["mult_mod=temp_Mult"]},{"n":"Banner","k":"manual","r":"main","c":"G.GAME.current_round.discards_left > 0","e":["chip_mod=G.GAME.current_round.discards_left*self.ability.extra"]},{"n":"Stuntman","k":"yes","r":"main","c":"","e":["chip_mod=self.ability.extra.chip_mod"]},{"n":"Supernova","k":"manual","r":"main","c":"","e":["mult_mod=G.GAME.hands[context.scoring_name].played"]},{"n":"Ceremonial Dagger","k":"yes","r":"main","c":"self.ability.mult > 0","e":["mult_mod=self.ability.mult"]},{"n":"Flower Pot","k":"manual","r":"main","c":"","e":["Xmult_mod=self.ability.extra"]},{"n":"Seeing Double","k":"manual","r":"main","c":"","e":["Xmult_mod=self.ability.extra"]},{"n":"Castle","k":"yes","r":"main","c":"(self.ability.extra.chips > 0)","e":["chip_mod=self.ability.extra.chips"]},{"n":"Blue Joker","k":"yes","r":"main","c":"#G.deck.cards > 0","e":["chip_mod=self.ability.extra*#G.deck.cards"]},{"n":"Erosion","k":"manual","r":"main","c":"(G.GAME.starting_deck_size - #G.playing_cards) > 0","e":["mult_mod=self.ability.extra*(G.GAME.starting_deck_size - #G.playing_cards)"]},{"n":"Stone Joker","k":"yes","r":"main","c":"self.ability.stone_tally > 0","e":["chip_mod=self.ability.extra*self.ability.stone_tally"]},{"n":"Steel Joker","k":"yes","r":"main","c":"self.ability.steel_tally > 0","e":["Xmult_mod=1 + self.ability.extra*self.ability.steel_tally"]},{"n":"Bull","k":"manual","r":"main","c":"(G.GAME.dollars + (G.GAME.dollar_buffer or 0)) > 0","e":["chip_mod=self.ability.extra*math.max(0"]},{"n":"Swashbuckler","k":"yes","r":"main","c":"self.ability.mult > 0","e":["mult_mod=self.ability.mult"]},{"n":"Joker","k":"yes","r":"main","c":"","e":["mult_mod=self.ability.mult"]},{"n":"Flash Card","k":"yes","r":"main","c":"self.ability.mult > 0","e":["mult_mod=self.ability.mult"]},{"n":"Popcorn","k":"yes","r":"main","c":"self.ability.mult > 0","e":["mult_mod=self.ability.mult"]},{"n":"Fortune Teller","k":"manual","r":"main","c":"G.GAME.consumeable_usage_total and G.GAME.consumeable_usage_total.tarot > 0","e":["mult_mod=G.GAME.consumeable_usage_total.tarot"]},{"n":"Gros Michel","k":"yes","r":"main","c":"","e":["mult_mod=self.ability.extra.mult"]},{"n":"Cavendish","k":"yes","r":"main","c":"","e":["Xmult_mod=self.ability.extra.Xmult"]},{"n":"Red Card","k":"yes","r":"main","c":"self.ability.mult > 0","e":["mult_mod=self.ability.mult"]},{"n":"Card Sharp","k":"yes","r":"main","c":"G.GAME.hands[context.scoring_name] and G.GAME.hands[context.scoring_name].played_this_round > 1","e":["Xmult_mod=self.ability.extra.Xmult"]},{"n":"Bootstraps","k":"manual","r":"main","c":"math.floor((G.GAME.dollars + (G.GAME.dollar_buffer or 0))/self.ability.extra.dollars) >= 1","e":["mult_mod=self.ability.extra.mult*math.floor((G.GAME.dollars + (G.GAME.dollar_buffer or 0))/self.ability.extra.dollars)"]},{"n":"Caino","k":"yes","r":"main","c":"self.ability.caino_xmult > 1","e":["Xmult_mod=self.ability.caino_xmult"]}]};
/* __JOKER_RULES_END__ */

/* __JOKER_STATE_BEGIN__ */
/* 每个小丑牌自己的"记录值"字段（每用一张塔罗牌 +1 倍率那种）与它读到的局面状态；
   由 .work/gen-state.js 从游戏源码里扫出来，界面据此生成输入框。 */
const JOKER_STATE = {"source":"card.lua 等（.work/gen-state.js 生成，勿手改）","jokers":{"Gold Card":{"mutable":["perish_tally"],"external":["G.GAME.perishable_rounds","G.GAME.round_resets.discards","G.hand","G.jokers"],"files":{"card.lua":3}},"Invisible Joker":{"mutable":["invis_rounds"],"external":["G.jokers"],"files":{"card.lua":5}},"To Do List":{"mutable":["to_do_poker_hand"],"external":["G.GAME.hands"],"files":{"card.lua":4}},"Caino":{"mutable":["caino_xmult"],"external":[],"files":{"card.lua":5}},"Yorick":{"mutable":["x_mult","yorick_discards"],"external":[],"files":{"card.lua":3}},"Loyalty Card":{"mutable":["burnt_hand","hands_played_at_create","loyalty_remaining"],"external":["G.GAME.blind","G.GAME.hands_played","G.GAME.inflation","G.GAME.used_jokers[k]","G.consumeables","G.jokers"],"files":{"card.lua":3}},"Credit Card":{"mutable":[],"external":["G.GAME.bankrupt_at"],"files":{"card.lua":3}},"Chicot":{"mutable":[],"external":["G.GAME.blind","G.GAME.blind.boss","G.GAME.blind.disabled"],"files":{"card.lua":3}},"Chaos the Clown":{"mutable":[],"external":["G.GAME.current_round.free_rerolls"],"files":{"card.lua":3}},"Turtle Bean":{"mutable":["extra.h_size"],"external":["G.hand","G.jokers"],"files":{"card.lua":4}},"To the Moon":{"mutable":[],"external":["G.GAME.interest_amount"],"files":{"card.lua":3}},"Troubadour":{"mutable":[],"external":["G.GAME.round_resets.hands","G.hand"],"files":{"card.lua":3}},"Stuntman":{"mutable":[],"external":["G.GAME.blind","G.GAME.round_resets.discards","G.consumeables","G.hand","G.jokers"],"files":{"card.lua":4}},"Fortune Teller":{"mutable":[],"external":["G.GAME.consumeable_usage_total","G.GAME.consumeable_usage_total.tarot"],"files":{"card.lua":3}},"Steel Joker":{"mutable":["steel_tally"],"external":["G.playing_cards"],"files":{"card.lua":3}},"Stone Joker":{"mutable":["stone_tally"],"external":["G.playing_cards"],"files":{"card.lua":3}},"Green Joker":{"mutable":["mult"],"external":[],"files":{"card.lua":4}},"Blue Joker":{"mutable":[],"external":["G.deck"],"files":{"card.lua":2}},"Sixth Sense":{"mutable":[],"external":["G.GAME.current_round.hands_played","G.consumeables"],"files":{"card.lua":2}},"Hack":{"mutable":[],"external":["G.hand"],"files":{"card.lua":2}},"Faceless Joker":{"mutable":[],"external":["G.hand"],"files":{"card.lua":2}},"Joker Stencil":{"mutable":["x_mult"],"external":["G.jokers"],"files":{"card.lua":3}},"Ceremonial Dagger":{"mutable":["mult"],"external":["G.jokers"],"files":{"card.lua":3}},"Banner":{"mutable":[],"external":["G.GAME.current_round.discards_left"],"files":{"card.lua":2}},"Misprint":{"mutable":[],"external":["G.deck"],"files":{"card.lua":2}},"Mystic Summit":{"mutable":[],"external":["G.GAME.current_round.discards_left"],"files":{"card.lua":2}},"Marble Joker":{"mutable":[],"external":["G.deck","G.playing_cards"],"files":{"card.lua":2}},"8 Ball":{"mutable":[],"external":["G.consumeables"],"files":{"card.lua":2}},"Dusk":{"mutable":[],"external":["G.GAME.current_round.hands_left"],"files":{"card.lua":2}},"Raised Fist":{"mutable":[],"external":["G.hand"],"files":{"card.lua":2}},"Abstract Joker":{"mutable":[],"external":["G.jokers"],"files":{"card.lua":2}},"Delayed Gratification":{"mutable":[],"external":["G.GAME.current_round.discards_left","G.GAME.current_round.discards_used","G.GAME.pack_choices","G.GAME.pack_size"],"files":{"card.lua":2}},"Gros Michel":{"mutable":[],"external":["G.GAME.pool_flags.gros_michel_extinct"],"files":{"card.lua":4}},"Supernova":{"mutable":[],"external":["G.GAME.hands[context.scoring_name].played"],"files":{"card.lua":2}},"Spare Trousers":{"mutable":["mult"],"external":[],"files":{"card.lua":3}},"Superposition":{"mutable":[],"external":["G.consumeables"],"files":{"card.lua":2}},"Ride the Bus":{"mutable":["mult"],"external":[],"files":{"card.lua":3}},"Egg":{"mutable":["extra_value"],"external":[],"files":{"card.lua":2}},"Burglar":{"mutable":[],"external":["G.GAME.current_round.discards_left"],"files":{"card.lua":2}},"Blackboard":{"mutable":[],"external":["G.hand"],"files":{"card.lua":2}},"Runner":{"mutable":["extra.chips"],"external":[],"files":{"card.lua":3}},"Ice Cream":{"mutable":["extra.chips"],"external":["G.jokers"],"files":{"card.lua":3}},"DNA":{"mutable":[],"external":["G.GAME.current_round.hands_played","G.deck","G.hand","G.playing_cards"],"files":{"card.lua":3}},"Constellation":{"mutable":["x_mult"],"external":[],"files":{"card.lua":2}},"Blueprint":{"mutable":[],"external":["G.jokers"],"files":{"card.lua":4}},"Cartomancer":{"mutable":[],"external":["G.consumeables"],"files":{"card.lua":2}},"Mr. Bones":{"mutable":[],"external":["G.GAME.blind.chips","G.GAME.chips"],"files":{"card.lua":2}},"Acrobat":{"mutable":[],"external":["G.GAME.current_round.hands_left"],"files":{"card.lua":2}},"Swashbuckler":{"mutable":["mult"],"external":["G.jokers"],"files":{"card.lua":3}},"Certificate":{"mutable":[],"external":["G.GAME.blind","G.hand"],"files":{"card.lua":2}},"Throwback":{"mutable":["x_mult"],"external":["G.GAME.skips"],"files":{"card.lua":3}},"Glass Joker":{"mutable":["x_mult"],"external":["G.hand"],"files":{"card.lua":4}},"Wee Joker":{"mutable":["extra.chips"],"external":[],"files":{"card.lua":3}},"The Idol":{"mutable":[],"external":["G.GAME.current_round.idol_card.id","G.GAME.current_round.idol_card.rank","G.GAME.current_round.idol_card.suit"],"files":{"card.lua":2}},"Matador":{"mutable":[],"external":["G.GAME.blind.triggered"],"files":{"card.lua":3}},"Hit the Road":{"mutable":["x_mult"],"external":[],"files":{"card.lua":3}},"Cavendish":{"mutable":[],"external":["G.jokers"],"files":{"card.lua":3}},"Card Sharp":{"mutable":[],"external":["G.GAME.hands[context.scoring_name]","G.GAME.hands[context.scoring_name].played_this_round"],"files":{"card.lua":2}},"Red Card":{"mutable":["mult"],"external":[],"files":{"card.lua":3}},"Madness":{"mutable":["x_mult"],"external":["G.jokers"],"files":{"card.lua":2}},"Square Joker":{"mutable":["extra.chips"],"external":[],"files":{"card.lua":3}},"Seance":{"mutable":[],"external":["G.consumeables"],"files":{"card.lua":2}},"Riff-raff":{"mutable":[],"external":["G.jokers"],"files":{"card.lua":2}},"Vampire":{"mutable":["x_mult"],"external":[],"files":{"card.lua":2}},"Hologram":{"mutable":["x_mult"],"external":[],"files":{"card.lua":3}},"Vagabond":{"mutable":[],"external":["G.GAME.dollars","G.consumeables"],"files":{"card.lua":2}},"Cloud 9":{"mutable":["nine_tally"],"external":["G.playing_cards"],"files":{"card.lua":3}},"Rocket":{"mutable":["extra.dollars"],"external":["G.GAME.blind.boss"],"files":{"card.lua":3}},"Obelisk":{"mutable":["x_mult"],"external":["G.GAME.hands","G.GAME.hands[context.scoring_name].played"],"files":{"card.lua":2}},"Luchador":{"mutable":[],"external":["G.GAME.blind","G.GAME.blind.disabled","G.jokers"],"files":{"card.lua":2}},"Gift Card":{"mutable":[],"external":["G.consumeables","G.jokers"],"files":{"card.lua":2}},"Erosion":{"mutable":[],"external":["G.GAME.starting_deck_size","G.playing_cards"],"files":{"card.lua":2}},"Mail-In Rebate":{"mutable":[],"external":["G.GAME.current_round.mail_card.id","G.GAME.current_round.mail_card.rank"],"files":{"card.lua":2}},"Hallucination":{"mutable":[],"external":["G.GAME.round_resets.ante","G.consumeables"],"files":{"card.lua":2}},"Lucky Cat":{"mutable":["x_mult"],"external":[],"files":{"card.lua":2}},"Baseball Card":{"mutable":[],"external":["G.jokers"],"files":{"card.lua":2}},"Bull":{"mutable":[],"external":["G.GAME.dollars"],"files":{"card.lua":2}},"Trading Card":{"mutable":[],"external":["G.GAME.current_round.discards_used"],"files":{"card.lua":3}},"Flash Card":{"mutable":["mult"],"external":[],"files":{"card.lua":3}},"Popcorn":{"mutable":["mult"],"external":["G.jokers"],"files":{"card.lua":3}},"Ramen":{"mutable":["x_mult"],"external":["G.jokers"],"files":{"card.lua":2}},"Ancient Joker":{"mutable":[],"external":["G.GAME.current_round.ancient_card.suit"],"files":{"card.lua":2}},"Seltzer":{"mutable":["extra"],"external":["G.jokers"],"files":{"card.lua":3}},"Castle":{"mutable":["extra.chips"],"external":["G.GAME.current_round.castle_card.suit"],"files":{"card.lua":3}},"Campfire":{"mutable":["x_mult"],"external":["G.GAME.blind.boss"],"files":{"card.lua":3}},"Brainstorm":{"mutable":[],"external":["G.jokers"],"files":{"card.lua":3}},"Satellite":{"mutable":[],"external":["G.GAME.consumeable_usage"],"files":{"card.lua":2}},"Driver":{"mutable":["driver_tally"],"external":["G.playing_cards"],"files":{"card.lua":3}},"Burnt Joker":{"mutable":[],"external":["G.GAME.current_round.discards_used","G.GAME.hands[text].chips","G.GAME.hands[text].level","G.GAME.hands[text].mult","G.hand"],"files":{"card.lua":2}},"Bootstraps":{"mutable":[],"external":["G.GAME.dollars"],"files":{"card.lua":2}},"Triboulet":{"mutable":[],"external":["G.hand"],"files":{"card.lua":2}},"Perkeo":{"mutable":[],"external":["G.consumeables"],"files":{"card.lua":2}},"Death":{"mutable":[],"external":["G.hand"],"files":{"card.lua":1}},"Strength":{"mutable":[],"external":["G.hand"],"files":{"card.lua":1}},"Black Hole":{"mutable":[],"external":["G.GAME.hands"],"files":{"card.lua":1}},"Talisman":{"mutable":[],"external":["G.hand"],"files":{"card.lua":1}},"Aura":{"mutable":[],"external":["G.hand"],"files":{"card.lua":2}},"Cryptid":{"mutable":[],"external":["G.deck","G.hand","G.playing_cards"],"files":{"card.lua":1}},"Sigil":{"mutable":[],"external":["G.hand"],"files":{"card.lua":3}},"Ouija":{"mutable":[],"external":["G.GAME.hands[self.ability.consumeable.hand_type].chips","G.GAME.hands[self.ability.consumeable.hand_type].level","G.GAME.hands[self.ability.consumeable.hand_type].mult","G.hand"],"files":{"card.lua":1}},"The Hanged Man":{"mutable":[],"external":["G.hand"],"files":{"card.lua":1}},"Familiar":{"mutable":[],"external":["G.hand"],"files":{"card.lua":3}},"Incantation":{"mutable":[],"external":["G.hand"],"files":{"card.lua":2}},"Immolate":{"mutable":[],"external":["G.hand","G.jokers"],"files":{"card.lua":1}},"The Fool":{"mutable":[],"external":["G.GAME.last_tarot_planet","G.consumeables"],"files":{"card.lua":2}},"The Hermit":{"mutable":[],"external":["G.GAME.dollars"],"files":{"card.lua":2}},"Temperance":{"mutable":["money"],"external":["G.hand","G.jokers"],"files":{"card.lua":3}},"The Emperor":{"mutable":[],"external":["G.consumeables"],"files":{"card.lua":3}},"Judgement":{"mutable":[],"external":["G.hand","G.jokers"],"files":{"card.lua":2}},"The Soul":{"mutable":[],"external":["G.jokers"],"files":{"card.lua":4}},"Ankh":{"mutable":[],"external":["G.GAME.blind","G.GAME.blind.name","G.jokers"],"files":{"card.lua":3}},"Wraith":{"mutable":[],"external":["G.GAME.dollars","G.jokers"],"files":{"card.lua":1}},"The Wheel of Fortune":{"mutable":[],"external":["G.jokers"],"files":{"card.lua":7}},"Ectoplasm":{"mutable":[],"external":["G.GAME.STOP_USE","G.GAME.ecto_minus","G.hand","G.jokers"],"files":{"card.lua":7}},"Hex":{"mutable":[],"external":["G.jokers"],"files":{"card.lua":3}}},"mutable":["burnt_hand","caino_xmult","driver_tally","extra","extra.chips","extra.dollars","extra.h_size","extra_value","hands_played_at_create","invis_rounds","loyalty_remaining","money","mult","nine_tally","perish_tally","steel_tally","stone_tally","to_do_poker_hand","x_mult","yorick_discards"],"external":["G.GAME.STOP_USE","G.GAME.bankrupt_at","G.GAME.blind","G.GAME.blind.boss","G.GAME.blind.chips","G.GAME.blind.disabled","G.GAME.blind.name","G.GAME.blind.triggered","G.GAME.chips","G.GAME.consumeable_usage","G.GAME.consumeable_usage_total","G.GAME.consumeable_usage_total.tarot","G.GAME.current_round.ancient_card.suit","G.GAME.current_round.castle_card.suit","G.GAME.current_round.discards_left","G.GAME.current_round.discards_used","G.GAME.current_round.free_rerolls","G.GAME.current_round.hands_left","G.GAME.current_round.hands_played","G.GAME.current_round.idol_card.id","G.GAME.current_round.idol_card.rank","G.GAME.current_round.idol_card.suit","G.GAME.current_round.mail_card.id","G.GAME.current_round.mail_card.rank","G.GAME.dollars","G.GAME.ecto_minus","G.GAME.hands","G.GAME.hands[context.scoring_name]","G.GAME.hands[context.scoring_name].played","G.GAME.hands[context.scoring_name].played_this_round","G.GAME.hands[self.ability.consumeable.hand_type].chips","G.GAME.hands[self.ability.consumeable.hand_type].level","G.GAME.hands[self.ability.consumeable.hand_type].mult","G.GAME.hands[text].chips","G.GAME.hands[text].level","G.GAME.hands[text].mult","G.GAME.hands_played","G.GAME.inflation","G.GAME.interest_amount","G.GAME.last_tarot_planet","G.GAME.pack_choices","G.GAME.pack_size","G.GAME.perishable_rounds","G.GAME.pool_flags.gros_michel_extinct","G.GAME.round_resets.ante","G.GAME.round_resets.discards","G.GAME.round_resets.hands","G.GAME.skips","G.GAME.starting_deck_size","G.GAME.used_jokers[k]","G.consumeables","G.deck","G.hand","G.jokers","G.playing_cards"]};
const MUTABLE_FIELDS = new Set(JOKER_STATE.mutable);
/* 有些牌的累计字段名和通用名不同，这里一并登记，读不出静态配置时按 0 起算 */
['caino_xmult', 'yorick_discards', 'perish_tally', 'nine_tally', 'driver_tally', 'steel_tally', 'stone_tally', 'invis_rounds', 'extra_value', 'loyalty_remaining'].forEach(function (f) { MUTABLE_FIELDS.add(f) });
/* __JOKER_STATE_END__ */

/* __JOKER_LOCVARS_BEGIN__ */
const JOKER_LOCVARS = {"Joker":["self.ability.mult"],"Mad Joker":["self.ability.t_mult","self.ability.type, 'poker_hands'"],"Droll Joker":["self.ability.t_mult","self.ability.type, 'poker_hands'"],"Clever Joker":["self.ability.t_chips","self.ability.type, 'poker_hands'"],"Crafty Joker":["self.ability.t_chips","self.ability.type, 'poker_hands'"],"Half Joker":["self.ability.extra.mult","self.ability.extra.size"],"Fortune Teller":["self.ability.extra","(G.GAME.consumeable_usage_total and G.GAME.consumeable_usage_total.tarot or 0)"],"Steel Joker":["self.ability.extra","1 + self.ability.extra*(self.ability.steel_tally or 0)"],"Chaos the Clown":["self.ability.extra"],"Space Joker":["''..(G.GAME and G.GAME.probabilities.normal or 1)","self.ability.extra"],"Stone Joker":["self.ability.extra","self.ability.extra*(self.ability.stone_tally or 0)"],"Drunkard":["self.ability.d_size"],"Green Joker":["self.ability.extra.hand_add","self.ability.extra.discard_sub","self.ability.mult"],"Credit Card":["self.ability.extra"],"Greedy Joker":["self.ability.extra.s_mult","self.ability.extra.suit, 'suits_singular'"],"Wrathful Joker":["self.ability.extra.s_mult","self.ability.extra.suit, 'suits_singular'"],"Blue Joker":["self.ability.extra","self.ability.extra*((G.deck and G.deck.cards) and #G.deck.cards or 52)"],"Mime":["self.ability.extra+1"],"Hack":["self.ability.extra+1"],"Pareidolia":["self.ability.extra.dollars","self.ability.extra.faces"],"Faceless Joker":["self.ability.extra.dollars","self.ability.extra.faces"],"Oops! All 6s":["self.ability.h_size"],"Juggler":["self.ability.h_size"],"Golden Joker":["self.ability.extra"],"Joker Stencil":["self.ability.x_mult"],"Four Fingers":["self.ability.mult"],"Ceremonial Dagger":["self.ability.mult"],"Banner":["self.ability.extra"],"Mystic Summit":["self.ability.extra.mult","self.ability.extra.d_remaining"],"Marble Joker":["self.ability.extra.Xmult","self.ability.extra.every + 1","localize{type = 'variable', key = (self.ability.loyalty_remaining == 0 and 'loyalty_active' or 'loyalty_inactive'), vars = {self.ability.loyalty_remaining}}"],"Loyalty Card":["self.ability.extra.Xmult","self.ability.extra.every + 1","localize{type = 'variable', key = (self.ability.loyalty_remaining == 0 and 'loyalty_active' or 'loyalty_inactive'), vars = {self.ability.loyalty_remaining}}"],"8 Ball":["''..(G.GAME and G.GAME.probabilities.normal or 1)","self.ability.extra"],"Dusk":["self.ability.extra+1"],"Raised Fist":["self.ability.extra"],"Fibonacci":["self.ability.extra"],"Scary Face":["self.ability.extra"],"Abstract Joker":["self.ability.extra","(G.jokers and G.jokers.cards and #G.jokers.cards or 0)*self.ability.extra"],"Delayed Gratification":["self.ability.extra"],"Gros Michel":["self.ability.extra.mult","''..(G.GAME and G.GAME.probabilities.normal or 1)","self.ability.extra.odds"],"Even Steven":["self.ability.extra"],"Odd Todd":["self.ability.extra"],"Scholar":["self.ability.extra.mult","self.ability.extra.chips"],"Business Card":["''..(G.GAME and G.GAME.probabilities.normal or 1)","self.ability.extra"],"Supernova":["self.ability.extra","'Two Pair', 'poker_hands'","self.ability.mult"],"Spare Trousers":["self.ability.extra","'Two Pair', 'poker_hands'","self.ability.mult"],"Superposition":["self.ability.extra"],"Ride the Bus":["self.ability.extra","self.ability.mult"],"Egg":["self.ability.extra"],"Burglar":["self.ability.extra"],"Blackboard":["self.ability.extra","'Spades', 'suits_plural'","'Clubs', 'suits_plural'"],"Runner":["self.ability.extra.chips","self.ability.extra.chip_mod"],"Ice Cream":["self.ability.extra.chips","self.ability.extra.chip_mod"],"DNA":["self.ability.extra"],"Splash":["self.ability.extra","self.ability.x_mult"],"Constellation":["self.ability.extra","self.ability.x_mult"],"Hiker":["self.ability.extra"],"To Do List":["self.ability.extra.dollars","self.ability.to_do_poker_hand, 'poker_hands'"],"Cartomancer":["self.ability.extra"],"Astronomer":["self.ability.extra"],"Golden Ticket":["self.ability.extra"],"Mr. Bones":["self.ability.extra"],"Acrobat":["self.ability.extra"],"Sock and Buskin":["self.ability.extra+1"],"Swashbuckler":["self.ability.mult"],"Troubadour":["self.ability.extra.h_size","-self.ability.extra.h_plays"],"Certificate":["self.ability.extra"],"Throwback":["self.ability.extra","self.ability.x_mult"],"Hanging Chad":["self.ability.extra"],"Rough Gem":["self.ability.extra"],"Bloodstone":["''..(G.GAME and G.GAME.probabilities.normal or 1)","self.ability.extra.odds","self.ability.extra.Xmult"],"Arrowhead":["self.ability.extra"],"Onyx Agate":["self.ability.extra"],"Glass Joker":["self.ability.extra","self.ability.x_mult"],"Showman":["self.ability.extra"],"Flower Pot":["self.ability.extra"],"Wee Joker":["self.ability.extra.chips","self.ability.extra.chip_mod"],"Merry Andy":["self.ability.d_size","self.ability.h_size"],"The Idol":["self.ability.extra","G.GAME.current_round.idol_card.rank, 'ranks'","G.GAME.current_round.idol_card.suit, 'suits_plural'"],"Seeing Double":["self.ability.extra"],"Matador":["self.ability.extra"],"Hit the Road":["self.ability.extra","self.ability.x_mult"],"The Duo":["self.ability.x_mult","self.ability.type, 'poker_hands'"],"The Family":["self.ability.x_mult","self.ability.type, 'poker_hands'"],"Cavendish":["self.ability.extra.Xmult","''..(G.GAME and G.GAME.probabilities.normal or 1)","self.ability.extra.odds"],"Card Sharp":["self.ability.extra.Xmult"],"Red Card":["self.ability.extra","self.ability.mult"],"Madness":["self.ability.extra","self.ability.x_mult"],"Square Joker":["self.ability.extra.chips","self.ability.extra.chip_mod"],"Seance":["self.ability.extra.poker_hand, 'poker_hands'"],"Riff-raff":["self.ability.extra"],"Vampire":["self.ability.extra","self.ability.x_mult"],"Shortcut":["self.ability.extra","self.ability.x_mult"],"Hologram":["self.ability.extra","self.ability.x_mult"],"Vagabond":["self.ability.extra"],"Baron":["self.ability.extra"],"Cloud 9":["self.ability.extra","self.ability.extra*(self.ability.nine_tally or 0)"],"Rocket":["self.ability.extra.dollars","self.ability.extra.increase"],"Obelisk":["self.ability.extra","self.ability.x_mult"],"Photograph":["self.ability.extra"],"Gift Card":["self.ability.extra"],"Turtle Bean":["self.ability.extra.h_size","self.ability.extra.h_mod"],"Erosion":["self.ability.extra","math.max(0,self.ability.extra*(G.playing_cards and (G.GAME.starting_deck_size - #G.playing_cards) or 0))","G.GAME.starting_deck_size"],"Reserved Parking":["self.ability.extra.dollars","''..(G.GAME and G.GAME.probabilities.normal or 1)","self.ability.extra.odds"],"Mail-In Rebate":["self.ability.extra","G.GAME.current_round.mail_card.rank, 'ranks'"],"To the Moon":["self.ability.extra"],"Hallucination":["G.GAME.probabilities.normal","self.ability.extra"],"Lucky Cat":["self.ability.extra","self.ability.x_mult"],"Baseball Card":["self.ability.extra"],"Bull":["self.ability.extra","self.ability.extra*math.max(0,G.GAME.dollars) or 0"],"Diet Cola":["localize{type = 'name_text', set = 'Tag', key = 'tag_double', nodes = {}}"],"Trading Card":["self.ability.extra"],"Flash Card":["self.ability.extra","self.ability.mult"],"Popcorn":["self.ability.mult","self.ability.extra"],"Ramen":["self.ability.x_mult","self.ability.extra"],"Ancient Joker":["self.ability.extra","G.GAME.current_round.ancient_card.suit, 'suits_singular'"],"Walkie Talkie":["self.ability.extra.chips","self.ability.extra.mult"],"Seltzer":["self.ability.extra"],"Castle":["self.ability.extra.chip_mod","G.GAME.current_round.castle_card.suit, 'suits_singular'","self.ability.extra.chips"],"Smiley Face":["self.ability.extra"],"Campfire":["self.ability.extra","self.ability.x_mult"],"Stuntman":["self.ability.extra.chip_mod","self.ability.extra.h_size"],"Invisible Joker":["self.ability.extra","self.ability.invis_rounds"],"Shoot the Moon":["self.ability.extra"],"Driver":["self.ability.extra","self.ability.driver_tally or '0'"],"Burnt Joker":["self.ability.extra.mult","self.ability.extra.dollars","self.ability.extra.mult*math.floor((G.GAME.dollars + (G.GAME.dollar_buffer or 0))/self.ability.extra.dollars)"],"Bootstraps":["self.ability.extra.mult","self.ability.extra.dollars","self.ability.extra.mult*math.floor((G.GAME.dollars + (G.GAME.dollar_buffer or 0))/self.ability.extra.dollars)"],"Caino":["self.ability.extra","self.ability.caino_xmult"],"Triboulet":["self.ability.extra"],"Yorick":["self.ability.extra.xmult","self.ability.extra.discards","self.ability.yorick_discards","self.ability.x_mult"],"Chicot":["self.ability.extra"],"Perkeo":["self.ability.extra"]};
/* __JOKER_LOCVARS_END__ */
const D = window.__BALATRO_DATA__;
const ATLAS = window.__BALATRO_ATLAS__;
const CARD_W = 71, CARD_H = 95;                 // logical tile size (matches game.lua px/py)
const ITEMS = D.items;
const BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

/* ------------------------------------------------------------------ state */
const S = {
  tab: 'codex',
  cat: 'all',
  q: '',
  sort: 'order',
  lang: 'zh_CN',
  scale: 2,
  // phase doubles as the game's G.TIMERS.REAL. t = 0 is the neutral pose: every sine
  // term of the floating-art animation vanishes there, so the character art is upright.
  phase: 0,
  blindFrame: 0,
  anim: { on: false, t: 0, speed: 4, seconds: 2.5, pingpong: true, fps: 20, loop: 'auto' },
  gifBg: null,
  rawSize: false,
  view: 'grid',
  sel: null,
  forge: {
    baseType: 'PlayingCard',
    base: 'S_A',
    baseQuery: '',
    back: 'b_red',
    enhancement: 'm_bonus',
    seal: 'Gold',
    // a joker can carry several stickers at once: eternal XOR perishable, plus rental
    // and one coloured stake sticker (game.lua: set_eternal / set_perishable / set_rental)
    stickers: { eternal: true, perishable: false, rental: false, color: '' },
    edition: 'e_foil',
    variants: false,
    showFront: true,
    open: null,        // which groups are expanded; null = decide from the viewport on first use
  },
  atlasOpen: {},
  source: 'all',   // 'all' | 'vanilla' | <mod id>
};
/* ------------------------------------------------------- imported mods */
const MODS = [];
const CAT_LABELS = new Map();
const MOD_SHADERS = {};   // shader key -> .fs source, for every imported mod
function categoryLabel (key) {
  if (CAT_LABELS.has(key)) return CAT_LABELS.get(key);
  const known = CATS.find((c) => c[0] === key);
  return known ? known[1] : key;
}
/** Register a parsed mod: atlas images, entries, and any new card types it declares. */
async function registerMod (parsed) {
  const modId = parsed.id;
  if (MODS.some((m) => m.id === modId)) return { ok: false, reason: '已导入同名 mod：' + modId };
  const addedAtlas = [];
  const byFile = new Map();   // mod path -> {url, w, h, error}
  // decode every sheet in parallel: Cryptid alone ships 60 of them, and a sequential load made
  // the import take several seconds on a phone
  const pending = [];
  for (const a of parsed.atlasIndex.values()) {
    const file = 'mod/' + modId + '/' + a.file;
    if (byFile.has(file)) continue;
    const url = URL.createObjectURL(new Blob([a.bytes], { type: 'image/png' }));
    ATLAS[file] = url;
    delete IMG[file]; delete IMG_READY[file];
    const im = new Image();
    const rec = { url, w: 0, h: 0, error: null };
    byFile.set(file, rec);
    // keep THIS element as the cached one: drawTileTo() reads IMG[file], and a second Image
    // created later may not be decoded yet (it would silently draw nothing)
    IMG[file] = im;
    IMG_READY[file] = new Promise((res) => {
      const ok = () => { rec.w = im.naturalWidth; rec.h = im.naturalHeight; res(im) };
      im.onload = ok;
      im.onerror = () => { rec.w = 0; rec.h = 0; res(null) };
    });
    im.src = url;
    pending.push(IMG_READY[file]);
  }
  if (pending.length) await Promise.all(pending);

  for (const a of parsed.atlasIndex.values()) {
    const file = 'mod/' + modId + '/' + a.file;
    const rec = byFile.get(file);
    if (!rec.w || !rec.h) {
      if (!rec.error) { rec.error = '图集 ' + a.key + ' 的图片无法解码'; parsed.warnings.push(rec.error) }
      continue;
    }
    void rec.url;
    let scale = a.scale;
    if (a.inferred) {
      // the file name was matched, so 1x/2x had to be guessed — keep whichever scale can
      // actually hold every pos the mod declares
      const realKey = a.aliasOf || a.key;
      const used = parsed.items.filter((it) => it.atlas === realKey && it.pos);
      // score, don't require: a single broken pos must not outweigh every correct one
      const score = (sc) => {
        const cols = Math.floor(rec.w / (sc * a.px)); const rows = Math.floor(rec.h / (sc * a.py));
        if (cols < 1 || rows < 1) return -1;
        return used.filter((it) => it.pos.x < cols && it.pos.y < rows).length;
      };
      const alt = scale === 2 ? 1 : 2;
      if (score(alt) > score(scale)) {
        parsed.warnings.push('图集 ' + a.key + ' 的贴图路径已丢失，按 ' + alt + 'x 处理（按条目坐标反推）');
        scale = alt;
      }
    }
    D.atlases[a.key] = {
      name: a.key, file, px: a.px, py: a.py, w: rec.w, h: rec.h, scale,
      cols: Math.max(1, Math.round(rec.w / (scale * a.px))),
      rows: Math.max(1, Math.round(rec.h / (scale * a.py))),
      frames: null, kind: 'mod', aliasOf: a.aliasOf || null,
    };
    addedAtlas.push(a.key);
  }
  for (const t of parsed.types) {
    if (!CAT_LABELS.has(t.key)) CAT_LABELS.set(t.key, t.key + '（mod 新类型）');
  }
  // shaders: SMODS prefixes the object key but sends the original one as the uniform name,
  // so register (and resolve) both spellings
  const modShaders = [];
  const missingShaders = [];
  for (const sh of parsed.shaders || []) {
    // SMODS registers the shader under a prefixed key but still sends the original name
    const cands = [sh.key, parsed.prefix ? parsed.prefix + '_' + sh.key : null].filter(Boolean);
    let prog = null;
    for (const cand of cands) {
      if (GL && GL.defineShader(cand, sh.source)) { prog = cand; MOD_SHADERS[cand] = sh.source; }
    }
    if (prog) modShaders.push(prog);
    else { missingShaders.push(sh.key); parsed.warnings.push('着色器 ' + sh.key + ' 无法编译（顶点专用或语法不受支持）') }
  }
  for (const it of parsed.items) {
    if (it.shader && !modShaders.some((k) => k === it.shader || k.endsWith('_' + it.shader))) {
      it.note = '这个版本用的是 mod 自定义着色器 ' + it.shader + '，但该着色器无法编译，下面显示的是不加特效的牌面';
    } else if (it.shader) it.note = null;
  }
  const oob = [];
  const dupes = [];
  for (const it of parsed.items) {
    // the same key declared twice (Cryptid does this for tier placeholders) is one card in game
    const prev = BY_ID[it.id];
    if (prev && prev.source === modId) { dupes.push(it.id); continue }
    // a pos outside the sheet would simply draw nothing — say so instead of showing a blank card
    const a = it.atlas ? D.atlases[it.atlas] : null;
    if (a && a.cols && it.pos && (it.pos.x >= a.cols || it.pos.y >= a.rows)) {
      oob.push(it.id + ' (pos ' + it.pos.x + ',' + it.pos.y + ' / ' + a.cols + '×' + a.rows + ')');
      it.pos = null; it.sprite = null;
    }
    if (BY_ID[it.id]) it.id = it.id + '@' + modId;   // shadowing a vanilla entry keeps both
    it.source = modId;
    it.sourceName = parsed.name;
    ITEMS.push(it);
    BY_ID[it.id] = it;
    D.counts[it.cat] = (D.counts[it.cat] || 0) + 1;
  }
  if (oob.length) parsed.warnings.push('以下条目的 pos 超出图集范围，已标为无贴图：' + oob.slice(0, 4).join('、') + (oob.length > 4 ? ' …' : ''));
  if (dupes.length) parsed.warnings.push('有 ' + dupes.length + ' 条声明用了同一个 key（游戏中后声明的会覆盖前面的），已合并：' + dupes.slice(0, 4).join('、') + (dupes.length > 4 ? ' …' : ''));
  MODS.push({
    id: modId, name: parsed.name, version: parsed.version, author: parsed.author,
    items: parsed.items.length, atlasKeys: addedAtlas, warnings: parsed.warnings, stats: parsed.stats,
  });
  return { ok: true, items: parsed.items.length, atlases: addedAtlas.length, warnings: parsed.warnings };
}
async function importModFiles (files, fallbackName) {
  const map = files instanceof Map ? files : await window.__MODIMPORT__.readFileList(files);
  const parsed = window.__MODIMPORT__.parseMod(map, fallbackName);
  const res = await registerMod(parsed);
  return Object.assign(res, { mod: parsed });
}
async function importModZip (arrayBuffer, name) {
  const files = await window.__MODIMPORT__.readZip(arrayBuffer);
  return importModFiles(files, name);
}
/** Unload a mod and rebuild counts. */
function removeMod (id) {
  for (let i = ITEMS.length - 1; i >= 0; i--) if (ITEMS[i].source === id) { delete BY_ID[ITEMS[i].id]; ITEMS.splice(i, 1) }
  const idx = MODS.findIndex((x) => x.id === id);
  if (idx >= 0) {
    for (const a of MODS[idx].atlasKeys) delete D.atlases[a];
    MODS.splice(idx, 1);
  }
  // shader sources belong to the mod; the compiled programs stay but nothing references them
  for (const k of Object.keys(MOD_SHADERS)) delete MOD_SHADERS[k];
  for (const k of Object.keys(D.counts)) delete D.counts[k];
  for (const it of ITEMS) D.counts[it.cat] = (D.counts[it.cat] || 0) + 1;
  if (S.source === id) S.source = 'all';
  render();
}
/** Entries visible under the current source filter. */
function sourceItems () {
  if (S.source === 'all') return ITEMS;
  if (S.source === 'vanilla') return ITEMS.filter((i) => !i.source);
  return ITEMS.filter((i) => i.source === S.source);
}

/* ---------------------------------------------------------- mod dropzone */
const MOD_LOG = [];
function modLog (kind, text) { MOD_LOG.push({ kind: kind || 'info', text: String(text) }); if (MOD_LOG.length > 240) MOD_LOG.shift() }

/** Walk a dropped directory entry, tagging every File with its relative path. */
function filesFromEntry (entry, out, prefix) {
  return new Promise((resolve) => {
    if (!entry) return resolve();
    if (entry.isFile) {
      entry.file((f) => {
        try { Object.defineProperty(f, '__rel', { value: (prefix || '') + f.name, configurable: true }) } catch (e) { /* ignore */ }
        out.push(f); resolve();
      }, () => resolve());
      return;
    }
    if (!entry.isDirectory) return resolve();
    const reader = entry.createReader();
    const acc = [];
    const next = () => reader.readEntries((ents) => {
      if (!ents.length) {
        Promise.all(acc.map((en) => filesFromEntry(en, out, (prefix || '') + entry.name + '/'))).then(() => resolve());
        return;
      }
      for (const en of ents) acc.push(en);
      next();
    }, () => resolve());
    next();
  });
}
/** Collect the files of a drop; folders are walked through the entries API. */
async function filesFromDrop (dt) {
  const out = [];
  const items = dt && dt.items ? Array.from(dt.items) : [];
  const entries = [];
  for (const it of items) if (it.kind === 'file' && typeof it.webkitGetAsEntry === 'function') { const en = it.webkitGetAsEntry(); if (en) entries.push(en) }
  if (entries.length) { await Promise.all(entries.map((en) => filesFromEntry(en, out, ''))); if (out.length) return out }
  return Array.from((dt && dt.files) || []);
}
const isZipName = (n) => /\.(zip|balatro|mod)$/i.test(String(n || ''));

/** Import from a folder picker / drop (Files) or from a single .zip. */
async function importBatch (input, fallbackName) {
  const files = Array.from(input || []);
  if (!files.length) { toast('没有读到文件'); return null }
  const first = files[0].__rel || files[0].webkitRelativePath || files[0].name;
  let res = null;
  try {
    if (files.length === 1 && isZipName(first)) {
      modLog('info', '读取压缩包 ' + first + ' …');
      res = await importModZip(await files[0].arrayBuffer(), first.replace(/\.[^.]+$/, ''));
    } else {
      res = await importModFiles(files, fallbackName);
    }
  } catch (e) {
    modLog('bad', '解析出错：' + (e && e.message ? e.message : e));
    toast('解析出错，详见导入面板的日志');
    render();
    return null;
  }
  if (!res || !res.ok) {
    const why = (res && res.reason) || '未知错误';
    modLog('bad', '导入失败：' + why);
    toast('导入失败：' + why);
  } else {
    const st = (res.mod && res.mod.stats) || {};
    modLog('ok', `已导入「${res.mod.name}」：条目 ${res.items} · 图集 ${res.atlases} · 扫描 ${st.decls || 0} 条声明（跳过 ${st.skipped || 0}）${st.shaders ? ' · 自带 ' + st.shaders + ' 个着色器（已接入）' : ''}`);
    for (const w of res.warnings || []) modLog('warn', '· ' + w);
    toast(`已导入 ${res.mod.name}：${res.items} 个条目`);
  }
  render();
  return res;
}
async function importZipBuffer (buf, name) {
  try {
    const res = await importModZip(buf, name);
    if (!res || !res.ok) modLog('bad', '导入失败：' + ((res && res.reason) || '未知错误'));
    else { modLog('ok', `已导入「${res.mod.name}」：条目 ${res.items} · 图集 ${res.atlases}`); for (const w of res.warnings || []) modLog('warn', '· ' + w) }
    render();
    return res;
  } catch (e) {
    modLog('bad', '压缩包解析出错：' + (e && e.message ? e.message : e));
    render();
    return null;
  }
}

function viewMods (root) {
  const v = document.createElement('div');
  v.className = 'modsview';
  const modItems = MODS.reduce((a, m) => a + m.items, 0);
  v.innerHTML = `
    <h2>导入 Mod 素材</h2>
    <p class="lead">支持 <b>Steamodded（SMODS）格式</b> 的 Mod：把整个 Mod 文件夹拖进来，或者选它的 <code>.zip</code>。
      解析完全在本页进行——<b>不联网、不上传任何文件</b>。导入后，Mod 的小丑牌 / 消耗品 / 它自己新增的类型会直接进入图鉴，
      可以预览、搜索、合成，并导出 PNG / GIF / APNG / ZIP。</p>
    <div class="drop" id="modDrop">
      <div class="big">⊕</div>
      <div class="t">把 Mod 文件夹或 .zip 拖到这里</div>
      <div class="s">文件夹里需要有 <code>manifest.json</code> 和入口 lua，图集放在 <code>assets/2x/</code> 或 <code>assets/1x/</code></div>
      <div class="dropbtns">
        <button class="btn primary" id="modPickDir">选择 Mod 文件夹</button>
        <button class="btn" id="modPickZip">选择 Mod zip</button>
        ${MODS.length ? `<button class="btn" id="modClear">全部卸载（${MODS.length}）</button>` : ''}
      </div>
      <input type="file" id="modDirInput" class="filein" webkitdirectory directory multiple>
      <input type="file" id="modZipInput" class="filein">
    </div>
    <div class="glabel">已导入（${MODS.length} 个 Mod · ${modItems} 个条目）</div>
    <div class="modlist" id="modList"></div>
    <div class="glabel">导入日志</div>
    <div class="modlog" id="modLogBox"></div>
    <p class="lead" style="margin-top:2px">说明：解析器直接扫描 lua 里的 <code>SMODS.XXX{ ... }</code> 声明，并按 Mod 的 key 前缀（默认取 mod id 前 4 个小写字符，或 manifest 里的 <code>prefix</code>）去匹配 atlas / 本地化条目。
      如果某个 Mod 的牌是运行时循环生成的，解析不到的条目会写进日志；把日志发给作者就能补规则。</p>`;

  const list = v.querySelector('#modList');
  if (!MODS.length) {
    const h = document.createElement('div');
    h.className = 'hint';
    h.textContent = '还没有导入任何 Mod。';
    list.appendChild(h);
  }
  for (const m of MODS) {
    const c = document.createElement('div');
    c.className = 'modcard';
    const warns = m.warnings || [];
    const shown = warns.slice(0, 5);
    c.innerHTML = `
      <div class="mh"><b>${esc(m.name)}</b><span class="mid">${esc(m.id)}</span><span class="sp"></span>
        <button class="btn" data-act="view">在图鉴中查看</button>
        <button class="btn" data-act="del">卸载</button></div>
      <div class="meta">
        <span>版本 <b>${esc(m.version || '—')}</b></span>
        <span>作者 <b>${esc(m.author || '—')}</b></span>
        <span>条目 <b>${m.items}</b></span>
        <span>图集 <b>${m.atlasKeys.length}</b></span>
        ${m.stats ? `<span>声明 <b>${m.stats.decls || 0}</b></span><span>文件 <b>${m.stats.files || 0}</b></span>` : ''}
        ${m.stats && m.stats.implicitPos ? `<span>隐含 pos <b>${m.stats.implicitPos}</b></span>` : ''}
        ${m.warnings.length ? `<span>警告 <b>${m.warnings.length}</b></span>` : ''}
      </div>
      ${shown.length ? `<div class="modwarns">${shown.map((w) => '· ' + esc(w)).join('<br>')}${warns.length > shown.length ? `<br>…还有 ${warns.length - shown.length} 条，见下方日志` : ''}</div>` : ''}`;
    c.querySelector('[data-act="view"]').onclick = () => { S.source = m.id; S.cat = 'all'; S.tab = 'codex'; render() };
    c.querySelector('[data-act="del"]').onclick = () => { removeMod(m.id); toast('已卸载 ' + m.name) };
    list.appendChild(c);
  }
  const logBox = v.querySelector('#modLogBox');
  if (!MOD_LOG.length) logBox.textContent = '（暂无）';
  else logBox.innerHTML = MOD_LOG.map((l) => `<span class="${l.kind === 'info' ? '' : l.kind}">${esc(l.text)}</span>`).join('\n');
  logBox.scrollTop = logBox.scrollHeight;

  const drop = v.querySelector('#modDrop');
  const dirIn = v.querySelector('#modDirInput');
  const zipIn = v.querySelector('#modZipInput');
  // phones have no directory picker, so do not offer a button that cannot do anything
  const dirPicker = 'webkitdirectory' in document.createElement('input');
  const pickDirBtn = v.querySelector('#modPickDir');
  if (!dirPicker) {
    pickDirBtn.disabled = true;
    pickDirBtn.title = '这个浏览器的文件选择器不支持选文件夹，请改用 zip 或直接拖进来';
    pickDirBtn.textContent = '选择 Mod 文件夹（此浏览器不支持）';
  } else pickDirBtn.onclick = () => dirIn.click();
  v.querySelector('#modPickZip').onclick = () => zipIn.click();
  const clear = v.querySelector('#modClear');
  if (clear) clear.onclick = () => { for (const m of MODS.slice()) removeMod(m.id); toast('已卸载全部 Mod') };
  // NOTE: input.files is a live FileList — clearing the input first would empty it, which is
  // why the picker used to report "没有读到文件". Snapshot before resetting.
  dirIn.onchange = () => { const f = Array.from(dirIn.files); dirIn.value = ''; importBatch(f) };
  zipIn.onchange = () => { const f = Array.from(zipIn.files); zipIn.value = ''; importBatch(f) };

  for (const ev of ['dragenter', 'dragover']) drop.addEventListener(ev, (e) => { e.preventDefault(); e.stopPropagation(); drop.classList.add('over') });
  for (const ev of ['dragleave', 'dragend']) drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over') });
  drop.addEventListener('drop', (e) => {
    e.preventDefault(); e.stopPropagation();
    drop.classList.remove('over');
    filesFromDrop(e.dataTransfer).then((files) => importBatch(files));
  });
  // a drop anywhere else in the content area would otherwise be handled by the browser
  for (const ev of ['dragover', 'drop']) root.addEventListener(ev, (e) => { if (e.target === root || e.target === v) { e.preventDefault(); e.stopPropagation() } });
  root.appendChild(v);
}

/** Value fed to compose() as the game's G.TIMERS.REAL: live animation clock or the static slider. */
const phaseNow = () => (S.anim.on ? S.anim.t : S.phase);
let animRAF = null;
let animLast = 0;
function startAnim (repaint) {
  stopAnim();
  S.anim.on = true;
  const step = (ts) => {
    animRAF = requestAnimationFrame(step);
    if (!animLast) animLast = ts;
    const dt = Math.min(0.06, (ts - animLast) / 1000);
    animLast = ts;
    // the preview runs at the same multiplier the export uses, so the speed selector is visible
    S.anim.t += dt * (S.anim.speed || 1);
    repaint();
  };
  animRAF = requestAnimationFrame(step);
}
function stopAnim () {
  if (animRAF) cancelAnimationFrame(animRAF);
  animRAF = null; animLast = 0;
  S.anim.on = false;
}
/** The game lets several stickers share one joker; wall-clock tilt binding is gone. */

/* ---------------------------------------------------------------- atlases */
const IMG = {};
const IMG_READY = {};
let ALL_READY = Promise.resolve();
let REPAINT_TIMER = null;
/** 某张贴图解完码之后，如果首屏早就画完了，就把当前这一屏重画一次。
 *  没有这一步，那些「先画好、图还没解码」的缩略图会一直空着 —— 用户报的正是这个：
 *  选完 exe 进合成台，「选择主体」里的缩略图不显示，切到别的工具再回来才有。 */
function scheduleRepaint () {
  if (typeof window === 'undefined' || !window.__BALATRO_READY__ || REPAINT_TIMER) return;
  const ae = document.activeElement;
  if (ae && /^(INPUT|SELECT|TEXTAREA)$/.test(ae.tagName)) return;   /* 正在输入框里就别抢焦点 */
  REPAINT_TIMER = setTimeout(() => { REPAINT_TIMER = null; if (!SCP.open) { try { render() } catch (e) { /* ignore */ } } }, 150);
}
function img (file) {
  if (!IMG[file]) {
    const el = new Image();
    el.src = ATLAS[file] || '';
    IMG[file] = el;
    IMG_READY[file] = new Promise((res) => {
      const done = (v) => { res(v); scheduleRepaint(); };
      if (el.complete && el.naturalWidth) done(el);
      else { el.onload = () => done(el); el.onerror = () => done(null); }
    });
  }
  return IMG[file];
}
function atlas (name) { return D.atlases[name] || null; }
/** Pixel rect of one tile inside its sheet, at native resolution. */
function tileRect (atlasName, pos, file) {
  const a = atlas(atlasName);
  if (!a || !pos) return null;
  const s = a.scale;
  const px = a.px * s, py = a.py * s;
  return { x: pos.x * px, y: pos.y * py, w: px, h: py, file: file || a.file, atlasName };
}

/* --------------------------------------------------- WebGL edition shaders */
/* ------------------------------------------------- game shaders on WebGL
 * The .fs files the game ships (and the ones a mod brings) are LÖVE-flavoured GLSL.
 * glshaders.js translates them, so the effects here are the real thing rather than a
 * re-implementation — and any mod shader compiles along with them.
 *
 * A sprite draw in LÖVE hands the shader:
 *   time            a per-card constant (engine/sprite.lua:100)
 *   texture_details {x, y, w, h} of the sprite's rect inside its sheet, in pixels
 *   image_details   the sheet's pixel size
 *   shadow          true only for the drop-shadow pass
 *   dissolve        |card.dissolve| — 0 for a still card
 *   <shader name>   {G.TIMERS.REAL/28, G.TIMERS.REAL}   <- the animation clock
 * so that is exactly what shade() sends.
 * ------------------------------------------------------------------------- */
const GL = (() => {
  const canvas = document.createElement('canvas');
  const attrs = { premultipliedAlpha: false, preserveDrawingBuffer: true, alpha: true, antialias: false };
  const gl2 = canvas.getContext('webgl2', attrs);
  const gl = gl2 || canvas.getContext('webgl', attrs) || canvas.getContext('experimental-webgl', attrs);
  if (!gl) return null;
  const LIB = window.__GLSHADERS__;
  const IS2 = !!gl2;
  const VS = LIB.buildVertex(IS2);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  const programs = {};        // key -> { p, aPos, u:{}, flavour }
  const textures = new Map(); // sheet file -> { tex, w, h }

  /** Compile one shader and cache the uniform locations we send. */
  function defineShader (key, source) {
    if (!LIB.hasEffect(source)) return null;
    const res = LIB.compile(gl, IS2, source, VS);
    if (!res.program) { console.warn('[Balatro 素材图鉴] 着色器 ' + key + ' 编译失败：' + res.log); return null }
    const p = res.program;
    const u = {};
    const names = LIB.uniformNames(source).concat(['sample_tex', 'tex0', 'uUvRect', 'uImageDetails', 'uTileOrigin']);
    names.push('love_ScreenSize');
    for (const n of names) {
      const loc = gl.getUniformLocation(p, n);
      if (loc !== null) u[n] = loc;
    }
    const pr = {
      p,
      aPos: gl.getAttribLocation(p, 'aPos'),
      u,
      flavour: LIB.flavourUniform(source),
      key,
      source,
    };
    programs[key] = pr;
    return pr;
  }

  /* every vanilla shader that has a fragment stage; skew/vortex are vertex-only (tilt) */
  let compiled = 0;
  for (const sh of D.shaders) if (defineShader(sh.name, sh.source)) compiled++;

  /** Upload (once) and cache a sheet as a GL texture. */
  function sheetTexture (file) {
    const im = img(file);
    if (!im || !im.complete || !im.naturalWidth) return null;
    let rec = textures.get(file);
    if (rec && rec.w === im.naturalWidth && rec.h === im.naturalHeight) return rec;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    rec = { tex, w: im.naturalWidth, h: im.naturalHeight };
    textures.set(file, rec);
    return rec;
  }

  /**
   * Run a shader over one rect of one sheet and return it on a fresh 2D canvas.
   * `ref` is { file, x, y, w, h } in sheet pixels — the same thing Sprite:get_pos_pixel
   * hands the game's shaders, so the effect lands on the same pixels it would in game.
   */
  /** Shared per-draw setup: program, buffer, viewport, texture unit. */
  function begin (pr, W, H) {
    canvas.width = W; canvas.height = H;
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.BLEND);
    gl.useProgram(pr.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(pr.aPos);
    gl.vertexAttribPointer(pr.aPos, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(pr.u.tex0, 0);
    if (pr.u.sample_tex) gl.uniform1i(pr.u.sample_tex, 0);
  }
  /**
   * The uniforms every game shader receives (engine/sprite.lua:96-106).
   *
   * `w`/`h` are the card's pixel size in the same units the shader sees as "screen":
   * in game a card is `G.TILESCALE*G.TILESIZE` ≈ 73 px wide on screen and
   * `screen_scale = TILESCALE*TILESIZE*CANV_SCALE` ≈ 109 (CANV_SCALE is 1.5), while
   * `mouse_screen_pos` is the cursor — which sits *on* the card whenever a player is
   * looking at one. Our card is drawn at an arbitrary zoom, so the ratio is what matters:
   * screen_scale = 1.5*w and the "cursor" at the card's centre reproduce the game's
   * geometry exactly (mouse_offset ≈ ±1/3 across the card). Passing screen_scale = w with
   * mouse at (0,0) — as this used to — inflated every cursor-distance term, which is what
   * made shaders like Cryptid's astral wash out to white.
   */
  function commonUniforms (pr, phase, opts, w, h) {
    const u = pr.u;
    if (u.time) gl.uniform1f(u.time, opts.time !== undefined ? opts.time : phase);
    if (u.dissolve) gl.uniform1f(u.dissolve, opts.dissolve || 0);
    if (u.shadow) gl.uniform1i(u.shadow, opts.shadow ? 1 : 0);
    if (u.hovering) gl.uniform1f(u.hovering, 0);
    if (u.screen_scale) gl.uniform1f(u.screen_scale, 1.5 * w);
    if (u.mouse_screen_pos) gl.uniform2f(u.mouse_screen_pos, w / 2, h / 2);
    if (u.love_ScreenSize) gl.uniform2f(u.love_ScreenSize, w, h);
    if (u.burn_colour_1) gl.uniform4f(u.burn_colour_1, 0, 0, 0, 0);
    if (u.burn_colour_2) gl.uniform4f(u.burn_colour_2, 0, 0, 0, 0);
    /* 效果自己的 vec2 = send_to_shader = {min(VT.r*3,1)+REAL/28, REAL}（card.lua:4349-4350）。
       y 分量在游戏里是 G.TIMERS.REAL，**永远大于 0**；而 negative.fs 拿它当开关：
         if (negative.g > 0.0 || negative.g < 0.0) SAT.b = 1.-SAT.b;
       传 0 的话"明度反相"整段会被跳过 —— 负片就只剩红色通道反相 + 蓝灰叠色，和原版完全不是一回事。
       相位滑杆默认 0，所以这里取 max(phase, 1)：既不会变成 0，也和游戏里的"某一帧"等价。
       （hologram.fs 同样用自己的 .g 当时间量，一起修好。） */
    if (pr.flavour && u[pr.flavour]) gl.uniform2f(u[pr.flavour], phase / 28, Math.max(phase, 1));
  }
  /** Copy the result off the GL canvas. */
  function finish (W, H) {
    const out = document.createElement('canvas');
    out.width = W; out.height = H;
    out.getContext('2d').drawImage(canvas, 0, 0);
    return out;
  }

  function shade (key, ref, W, H, phase, opts) {
    const pr = programs[key];
    if (!pr) return null;
    const sheet = sheetTexture(ref.file);
    if (!sheet) return null;
    opts = opts || {};
    begin(pr, W, H);
    gl.bindTexture(gl.TEXTURE_2D, sheet.tex);
    const u = pr.u;
    if (u.uUvRect) gl.uniform4f(u.uUvRect, ref.x / sheet.w, ref.y / sheet.h, ref.w / sheet.w, ref.h / sheet.h);
    if (u.uImageDetails) gl.uniform2f(u.uImageDetails, sheet.w, sheet.h);
    if (u.uTileOrigin) gl.uniform2f(u.uTileOrigin, ref.x, ref.y);
    // tile units, not pixels — see the note above
    if (u.texture_details) gl.uniform4f(u.texture_details, ref.x / ref.w, ref.y / ref.h, ref.w, ref.h);
    if (u.image_details) gl.uniform2f(u.image_details, sheet.w, sheet.h);
    commonUniforms(pr, phase, opts, ref.w, H);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return finish(W, H);
  }

  /**
   * Shade a canvas that is NOT part of a sheet (a composed card, a shader-preview tile).
   * The game never does this, but the shader previews need it; the sheet is the canvas itself.
   */
  function shadeCanvas (key, cv, phase, opts) {
    const pr = programs[key];
    if (!pr) return null;
    opts = opts || {};
    const W = cv.width; const H = cv.height;
    begin(pr, W, H);
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const u = pr.u;
    if (u.uUvRect) gl.uniform4f(u.uUvRect, 0, 0, 1, 1);
    if (u.uImageDetails) gl.uniform2f(u.uImageDetails, W, H);
    if (u.uTileOrigin) gl.uniform2f(u.uTileOrigin, 0, 0);
    if (u.texture_details) gl.uniform4f(u.texture_details, 0, 0, W, H);
    if (u.image_details) gl.uniform2f(u.image_details, W, H);
    commonUniforms(pr, phase, opts, W, H);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.deleteTexture(tex);
    return finish(W, H);
  }

  return {
    gl, IS2, canvas, programs, buf, shade, shadeCanvas, defineShader, sheetTexture, textures,
    get count () { return compiled },
    dropTextures () { for (const r of textures.values()) gl.deleteTexture(r.tex); textures.clear() },
    names () { return Object.keys(programs) },
  };
})();

/** Shade one atlas tile: the atlas-space rect a sprite draw would use. */
function shadeTile (spec, W, H, key, phase, opts) {
  if (!GL || !spec || !spec.pos) return null;
  const r = tileRect(spec.atlas, spec.pos);
  if (!r) return null;
  return GL.shade(key, { file: r.file, x: r.x, y: r.y, w: r.w, h: r.h }, W, H, phase, opts);
}

/**
 * Run a static frame of one of the edition shaders over a canvas.
 * Mirrors Card:draw's send_to_shader: phase.x = min(VT.r*3,1)+REAL/28, phase.y = REAL.
 */
/** Shade a plain canvas (not part of a sheet). Kept for the shader-preview page. */
function glApply (key, src, w, h, phase) {
  if (!GL || !GL.programs[key]) return null;
  return GL.shadeCanvas(key, src, phase);
}
/** Atlas-space uv rect of a tile — only used by the shader preview page now. */
function uvRectOf (spec) {
  const a = atlas(spec.atlas);
  if (!a || !spec.pos) return null;
  return { ox: spec.pos.x / a.cols, oy: spec.pos.y / a.rows, sx: 1 / a.cols, sy: 1 / a.rows };
}
/** Render just one tile onto its own transparent canvas. */
function tileLayer (spec, W, H, highContrast) {
  const c = newCanvas(W, H);
  drawTileTo(c.getContext('2d'), spec, 0, 0, W, H, highContrast);
  return c;
}
/** Run a shader over a whole canvas; null when unavailable so callers can skip the pass. */
function shade (cv, key, phase) {
  if (!GL || !GL.programs[key]) return null;
  return GL.shadeCanvas(key, cv, phase);
}
/** Draw a sprite, then draw the same sprite again through a shader on top of it.
 *  This is exactly what Card:draw does: the "effect" passes are extra layers, not
 *  replacements — the card underneath stays fully opaque. */
function drawShaded (ctx, spec, W, H, key, phase, opts) {
  const base = tileLayer(spec, W, H);
  ctx.drawImage(base, 0, 0);
  const over = shadeTile(spec, W, H, key, phase, opts);
  if (over) ctx.drawImage(over, 0, 0);
}

/* ------------------------------------------------------------- composition */
function newCanvas (w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

function drawTileTo (ctx, spec, dx, dy, dw, dh, highContrast) {
  if (!spec || !spec.pos) return;
  const a = atlas(spec.atlas);
  if (!a) return;
  let file = a.file;
  if (highContrast && spec.atlas2 && D.atlases[spec.atlas2]) file = D.atlases[spec.atlas2].file;
  const r = tileRect(spec.atlas, spec.pos, file);
  const im = img(r.file);
  if (!im.complete || !im.naturalWidth) return;
  ctx.drawImage(im, r.x, r.y, r.w, r.h, dx, dy, dw, dh);
}

const EDITION_SHADER = { e_foil: 'foil', e_holo: 'holo', e_polychrome: 'polychrome', e_negative: 'negative' };
/** The shader a card should use for an edition item: a vanilla name, or a mod shader key. */
function editionShaderOf (it) {
  if (!it) return null;
  if (it.shader) return resolveShaderKey(it.shader);
  return (it.raw && it.raw.set === 'Edition') ? it.id : null;
}
/** Accepts either the bare or the mod-prefixed spelling of a shader key. */
function resolveShaderKey (key) {
  if (!key) return null;
  if (GL && GL.programs[key]) return key;
  for (const cand of Object.keys(MOD_SHADERS)) {
    if (cand.endsWith('_' + key)) return cand;
  }
  return key;
}
const COM = D.composition;

/**
 * Compose one card, mirroring Card:draw's layer order:
 *   centre (set shader) -> front -> edition shader -> seal (voucher shader if Gold)
 *   -> sticker (voucher shader) -> floating soul sprite (scale/rotate animated)
 * spec: {back, center, front, seal, sticker(s), edition, setShader, soul, soulHologram, highContrast, standalone}
 * sticker is either a vanilla sticker key or {atlas, pos} for a sprite an imported mod declared.
 * `phase` doubles as the game's G.TIMERS.REAL, so it drives both shaders and the float.
 */
function compose (spec, scale, phase) {
  scale = scale || 2;
  phase = phase === undefined ? S.phase : phase;
  if (spec.standalone) {
    const a = atlas(spec.standalone.atlas);
    if (!a) return newCanvas(Math.round(CARD_W * scale), Math.round(CARD_H * scale));
    const c = newCanvas(Math.round(a.px * scale), Math.round(a.py * scale));
    drawTileTo(c.getContext('2d'), spec.standalone, 0, 0, c.width, c.height);
    return c;
  }
  const W = Math.round(CARD_W * scale), H = Math.round(CARD_H * scale);
  const cv = newCanvas(W, H);
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  if (spec.back) {
    drawTileTo(ctx, spec.back, 0, 0, W, H, spec.highContrast);
    return cv;
  }

  const centre = spec.center ? tileLayer(spec.center, W, H, spec.highContrast) : null;
  const stone = spec.center && spec.center.stoneNoFront;
  const front = (spec.front && !stone) ? tileLayer(spec.front, W, H, spec.highContrast) : null;
  const negative = spec.edition === 'e_negative';
  // a vanilla edition name, or the key of a shader an imported mod brought with it
  const gloss = EDITION_SHADER[spec.edition] || (GL && GL.programs[spec.edition] ? spec.edition : null);
  const drawShadedTile = (spec2, key, opts) => {
    if (!spec2) return;
    const base = tileLayer(spec2, W, H, spec.highContrast);
    /* 负片牌上**不能**再把原图垫回去：原版（card.lua:4414-4420）负片是"替换"底图，
       之后只用 negative_shine 叠一层闪烁（那一层自己大部分是透明的）。
       之前这里把原图重新画了上去，于是负片看起来几乎就是原卡 + 一点蓝 —— 也就是用户说的
       "完全不对"。 */
    if (!negative) ctx.drawImage(base, 0, 0);
    const over = shadeTile(spec2, W, H, key, phase, opts);
    if (over) ctx.drawImage(over, 0, 0);
  };

  // 1-2) base pass. Negative replaces the normal draw; everything else adds a layer.
  if (spec.center) {
    if (negative) {
      const o = shadeTile(spec.center, W, H, 'negative', phase);
      ctx.drawImage(o || centre, 0, 0);
    } else ctx.drawImage(centre, 0, 0);
  }
  if (spec.front && !stone) {
    if (negative) {
      const o = shadeTile(spec.front, W, H, 'negative', phase);
      ctx.drawImage(o || front, 0, 0);
    } else ctx.drawImage(front, 0, 0);
  }

  // 3) Voucher / Booster / Spectral shimmer — centre sprite only
  if (spec.center && spec.setShader) drawShadedTile(spec.center, spec.setShader);

  // 4) Foil / Holographic / Polychrome gloss — centre AND front
  if (gloss && !negative) {
    drawShadedTile(spec.center, gloss);
    if (spec.front && !stone) drawShadedTile(spec.front, gloss);
  }

  // 5) Negative shine — centre sprite only
  if (negative && spec.center) drawShadedTile(spec.center, 'negative_shine');

  // 6) seal (gold seals get the voucher shimmer, per card.lua). A mod seal carries its own
  //    sprite, exactly like a mod sticker.
  const sealRef = (spec.seal && typeof spec.seal === 'object') ? spec.seal
    : (COM.sealPos[spec.seal] ? { atlas: 'centers', pos: COM.sealPos[spec.seal] } : null);
  if (sealRef && atlas(sealRef.atlas)) {
    if (spec.seal === 'Gold') drawShaded(ctx, sealRef, W, H, 'voucher', phase);
    else ctx.drawImage(tileLayer(sealRef, W, H, spec.highContrast), 0, 0);
  }
  // 7) stickers — a joker may carry several at once (eternal XOR perishable, + rental,
  //    + one coloured stake sticker). Each is drawn with the voucher shimmer.
  const stickers = spec.stickers || (spec.sticker ? [spec.sticker] : []);
  for (const s of stickers) {
    // a vanilla sticker is a key into the shared stickers sheet; a mod one carries its own sprite
    const ref = (s && typeof s === 'object')
      ? { atlas: s.atlas, pos: s.pos }
      : (COM.stickerPos[s] ? { atlas: 'stickers', pos: COM.stickerPos[s] } : null);
    if (!ref || !atlas(ref.atlas)) continue;
    drawShaded(ctx, ref, W, H, 'voucher', phase);
  }

  // 8) floating overlay sprite (legendary jokers / Hologram / The Soul)
  if (spec.soul && spec.soul.pos) {
    const t = phase;
    const frac = t - Math.floor(t);
    let sc; let rot;
    if (spec.soul.kind === 'soul') {
      // Card:draw -> 'The Soul' branch
      sc = 0.05 + 0.05 * Math.sin(1.8 * t) + 0.07 * Math.sin(frac * Math.PI * 14) * Math.pow(1 - frac, 3);
      rot = 0.1 * Math.sin(1.219 * t) + 0.07 * Math.sin(t * Math.PI * 5) * Math.pow(1 - frac, 2);
    } else {
      // Card:draw -> soul_pos branch
      sc = 0.07 + 0.02 * Math.sin(1.8 * t);
      rot = 0.05 * Math.sin(1.219 * t);
    }
    // Hologram's floating art is drawn through hologram.fs, and it samples the whole sheet,
    // so it must be shaded in atlas space (that is what shadeTile does).
    let layer = tileLayer(spec.soul, W, H, spec.highContrast);
    if (spec.soulHologram) layer = shadeTile(spec.soul, W, H, 'hologram', phase) || layer;
    const place = (cv, dx, dy, alpha) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(W / 2 + dx, H / 2 + dy);
      ctx.rotate(rot);
      ctx.scale(1 + sc, 1 + sc);
      ctx.imageSmoothingEnabled = true; // the floating art is rotated, so let it filter
      ctx.drawImage(cv, -W / 2, -H / 2);
      ctx.restore();
    };
    // The game draws the floating sprite twice: the first pass passes _shadow_height = 0,
    // which is TRUTHY in Lua, so dissolve.fs takes its shadow branch and emits a black
    // silhouette at 30% alpha, shifted down by (0.1 + 0.03 sin 1.8t) world units.
    // Hologram only gets the custom shader pass, so it has no shadow.
    if (!spec.soulHologram && !spec.soulNoShadow) {
      const WORLD_H = 2.7512; // G.CARD_H, i.e. the card's height in world units
      const dy = (0.1 + 0.03 * Math.sin(1.8 * t)) * (H / WORLD_H);
      // dissolve.fs with shadow = true emits the black 30%-alpha silhouette itself
      const sil = shadeTile(spec.soul, W, H, 'dissolve', phase, { shadow: true });
      place(sil || layer, 0, dy, sil ? 1 : 0.3);
    }
    place(layer, 0, 0, 1);
  }

  // Card:set_ability shrinks / squashes the card box for a few centres; every layer is
  // drawn "from children.center", so the whole composite is transformed together.
  if (spec.box && !S.rawSize && (spec.box.w !== 1 || spec.box.h !== 1)) {
    // booster packs are 1.27x, so the canvas has to grow or they get clipped
    const outW = Math.max(W, Math.round(W * spec.box.w));
    const outH = Math.max(H, Math.round(H * spec.box.h));
    const bw = Math.round(W * spec.box.w);
    const bh = Math.round(H * spec.box.h);
    const out = newCanvas(outW, outH);
    const g = out.getContext('2d');
    g.imageSmoothingEnabled = true; // non-integer rescale, so filter like LÖVE does
    g.drawImage(cv, Math.round((outW - bw) / 2), Math.round((outH - bh) / 2), bw, bh);
    return out;
  }
  return cv;
}

/** Sprite spec for a catalogue entry, choosing the most informative rendition. */
function specForItem (it) {
  const sampleFront = { atlas: 'cards_1', pos: { x: 12, y: 3 } }; // Ace of Spades
  const baseCenter = { atlas: 'centers', pos: COM.baseCenter.pos };
  const withLayers = (spec) => {
    if (it.setShader) spec.setShader = it.setShader;
    if (it.soul) spec.soul = it.soul;
    if (it.id === 'j_hologram') spec.soulHologram = true;
    return spec;
  };
  switch (it.cat) {
    case 'PlayingCard': return { center: baseCenter, front: { atlas: 'cards_1', pos: it.pos } };
    case 'Collab': return { center: baseCenter, front: { atlas: it.atlas, atlas2: it.atlas2, pos: it.pos } };
    case 'Enhancement':
      // a mod enhancement brings its own sheet; vanilla ones live in `centers`
      return it.pos
        ? { center: { atlas: (it.source && it.atlas) ? it.atlas : 'centers', pos: it.pos, stoneNoFront: it.id === 'm_stone' }, front: sampleFront }
        : { center: baseCenter, front: sampleFront };
    case 'Edition': {
      // vanilla editions are keyed by their own id (e_foil…); a mod edition names its .fs
      return { center: baseCenter, front: sampleFront, edition: editionShaderOf(it) };
    }
    case 'Seal':
      // vanilla seals are stamped from `centers`; a mod seal declares its own atlas/pos
      return { center: baseCenter, front: sampleFront, seal: (it.source && it.sprite && it.pos) ? { atlas: it.atlas, pos: it.pos } : it.key };
    case 'Sticker':
      // mod stickers are not in G.shared_stickers: draw the tile the mod declared
      return { center: baseCenter, front: sampleFront, sticker: (it.source && it.sprite && it.pos) ? { atlas: it.atlas, pos: it.pos } : it.key };
    case 'Tag':
    case 'Stake':
      return { standalone: { atlas: it.atlas, pos: it.pos } };
    case 'Blind': {
      // a mod blind ships its own static sheet; only vanilla's blind_chips is the 21-frame
      // animation (one row per blind, x = frame)
      if (it.source && it.atlas && it.atlas !== 'blind_chips') return { standalone: { atlas: it.atlas, pos: it.pos } };
      if (it.source && !it.atlas) return null;   // a mod blind with no art is not a vanilla blind
      const frames = (atlas('blind_chips') || {}).frames || 21;
      const f = ((S.blindFrame % frames) + frames) % frames;
      return { standalone: { atlas: 'blind_chips', pos: { x: f, y: it.pos.y } } };
    }
    case 'Deck': {
      // never fall back to the vanilla back for a mod deck that declared no atlas: that would
      // show an unrelated vanilla tile
      const backAtlas = it.atlas || (it.source ? null : 'centers');
      return (backAtlas && it.pos) ? { back: { atlas: backAtlas, pos: it.pos } } : null;
    }
    case 'Challenge': return { back: { atlas: 'centers', pos: { x: 0, y: 4 } } };
    case 'Overlay': return { standalone: { atlas: it.atlas, pos: it.pos } };
    default:
      if (it.sprite && it.sprite.atlas && it.pos) {
        const sp = withLayers({ center: { atlas: it.atlas, pos: it.pos } });
        if (it.box) sp.box = it.box;
        return sp;
      }
      return null;
  }
}

/* --------------------------------------------------------------- text markup */
const TAGCOL = D.colors.tags;
/* 花色文字的颜色：游戏里 G.C.SUITS 有两套（SO_1 标准 / SO_2 高对比），
   合成台的「高对比牌面」开关决定用哪一套。 */
const TAGCOL_HC = D.colors.tagsHC || TAGCOL;
let SUIT_HC = false;
const tagCol = (k) => ((SUIT_HC ? TAGCOL_HC[k] : null) || TAGCOL[k] || null);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Render one Balatro localisation string ("{C:attention}...{}") into HTML. */
function markup (line) {
  let out = '';
  let color = null; let scale = 1; let xStyle = false;
  const re = /\{([^{}]*)\}|([^{}]+)/g;
  let m;
  while ((m = re.exec(line))) {
    if (m[1] !== undefined) {
      const ctrl = m[1];
      if (ctrl === '') { color = null; scale = 1; xStyle = false; continue; }
      const parts = ctrl.split(',');
      for (const p of parts) {
        const [k, v] = p.split(':');
        if (k === 'C') { color = tagCol(v); }
        else if (k === 'X') { color = tagCol(v) || color; xStyle = true; }
        else if (k === 's' || k === 'S') { scale = parseFloat(v) || 1; }
        // V: variant colour (runtime), T: tooltip, E: emphasis — no visual change needed here
      }
      continue;
    }
    let text = m[2];
    if (!text) continue;
    text = esc(text).replace(/#(\d+)#/g, (mm, n) => `<span class="ph" title="运行时数值">#${n}#</span>`);
    const styles = [];
    if (color) styles.push('color:' + color);
    if (scale !== 1) styles.push('font-size:' + scale + 'em');
    out += `<span class="${xStyle ? 'x' : ''}${scale !== 1 ? ' sm' : ''}" style="${styles.join(';')}">${text}</span>`;
  }
  return out;
}
function descHTML (item) {
  const arr = item.text && item.text[S.lang] ? item.text[S.lang] : (item.text && item.text['en-us']) || [];
  if (!arr.length) return '<span style="color:var(--fg3)">—</span>';
  return arr.map((l) => `<span class="ln">${markup(l)}</span>`).join('');
}

/* ------------------------------------------------------------ deep links
 * #t=forge&c=Joker&s=testmod&i=j_cry_mosaic&q=mult&l=ja — only non-default values
 * are written, so a plain visit keeps a clean URL. Same code path on file://.
 * ------------------------------------------------------------------------- */
const HASH_KEYS = [['tab', 't'], ['cat', 'c'], ['source', 's'], ['sel', 'i'], ['q', 'q'], ['lang', 'l']];
function hashString () {
  const def = { tab: 'codex', cat: 'all', source: 'all', sel: null, q: '', lang: 'zh_CN' };
  const parts = [];
  for (const [key, short] of HASH_KEYS) {
    const v = S[key];
    if (v === undefined || v === null || v === '' || v === def[key]) continue;
    parts.push(short + '=' + encodeURIComponent(v));
  }
  return parts.length ? '#' + parts.join('&') : '#';
}
function syncHash () {
  const want = hashString();
  if (location.hash === want) return;
  try { history.replaceState(null, '', want) } catch (e) { location.hash = want.slice(1) }
}
/** Read the current hash into the state (validating against what actually exists). */
function applyHash () {
  const raw = (location.hash || '').replace(/^#/, '');
  if (!raw) return false;
  const map = {};
  for (const kv of raw.split('&')) {
    const i = kv.indexOf('=');
    if (i < 0) continue;
    map[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1));
  }
  let touched = false;
  for (const [key, short] of HASH_KEYS) {
    if (map[short] === undefined) continue;
    if (key === 'sel') { if (BY_ID[map[short]]) { S.sel = map[short]; touched = true } continue }
    if (key === 'lang') { if (D.meta.locales.some((l) => l.code === map[short])) { S.lang = map[short]; touched = true } continue }
    if (key === 'tab') {
      if (['codex', 'forge', 'atlas', 'hands', 'shaders', 'data', 'mods'].includes(map[short])) { S.tab = map[short]; touched = true }
      continue;
    }
    if (key === 'source') { S.source = map[short]; touched = true; continue }
    if (key === 'cat') { S.cat = map[short]; touched = true; continue }
    if (key === 'q') { S.q = map[short]; touched = true }
  }
  return touched;
}
/** The absolute URL for the current view, for「复制链接」. */
function shareUrl () {
  return location.origin === 'null' || !location.origin
    ? location.href.replace(/#.*$/, '') + hashString()
    : location.origin + location.pathname + location.search + hashString();
}
function copyLink () {
  const url = shareUrl();
  const done = () => toast('已复制链接：' + url.replace(/^https?:\/\/[^/]+/, ''));
  if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, () => prompt('复制这个链接：', url));
  else prompt('复制这个链接：', url);
}

/* ------------------------------------------------------------------ i18n */
function nm (item, lang) {
  /* 扑克牌的名字由花色 + 点数拼出来（游戏数据里没有给它们本地化名） */
  if (item && item.cat === 'PlayingCard' && item.suit && item.value != null) return pcName(item, lang);
  /* 扑克牌的名字由花色 + 点数拼出来（游戏数据里没有给它们本地化名） */
  lang = lang || S.lang;
  if (item.i18n && item.i18n[lang]) return item.i18n[lang];
  if (item.i18n && item.i18n['en-us']) return item.i18n['en-us'];
  return item.name || item.id;
}
const langLabel = (c) => (D.meta.locales.find((l) => l.code === c) || {}).label || c;

/* ---------------------------------------------------------------- search */
function buildBlob (it) {
  if (it._blob) return it._blob;
  const parts = [it.id, it.cat, it.set, it.name, it.effect, it.label, it.kind, it.atlas];
  if (it.i18n) for (const k in it.i18n) parts.push(it.i18n[k]);
  if (it.text) for (const k in it.text) parts.push([].concat(it.text[k]).join(' '));
  if (it.collabName) parts.push(it.collabName);
  parts.push(JSON.stringify(it.config || {}));
  if (it.pos) parts.push(`pos ${it.pos.x},${it.pos.y}`);
  it._blob = parts.filter(Boolean).join('\u0001').toLowerCase();
  return it._blob;
}
function parseQuery (q) {
  const terms = []; const filters = [];
  const re = /"([^"]*)"|(\S+)/g; let m;
  while ((m = re.exec(q))) {
    const tok = m[1] !== undefined ? m[1] : m[2];
    const fm = /^([a-z_]+)([:=<>!]+)(.+)$/i.exec(tok);
    if (fm && !/^https?$/i.test(fm[1])) filters.push({ field: fm[1].toLowerCase(), op: fm[2], val: fm[3].toLowerCase() });
    else terms.push(tok.toLowerCase());
  }
  return { terms, filters };
}
function matchFilter (it, f) {
  const num = (k) => (typeof it[k] === 'number' ? it[k] : null);
  switch (f.field) {
    case 'cat': case 'set': case 'id': case 'atlas': case 'effect': case 'kind': case 'source':
      return String(it[f.field] ?? '').toLowerCase().includes(f.val);
    case 'name':
      return (it.i18n ? Object.values(it.i18n).join('|') : it.name || '').toLowerCase().includes(f.val);
    case 'text':
      return (it.text ? Object.values(it.text).map((v) => [].concat(v).join(' ')).join('|') : '').toLowerCase().includes(f.val);
    case 'rarity': case 'cost': case 'order': case 'stake': case 'dollars': case 'mult': case 'weight': case 'ante': {
      const v = f.field === 'ante' ? (it.min_ante ?? -1) : num(f.field);
      if (v === null) return false;
      const want = parseFloat(f.val);
      if (Number.isNaN(want)) return false;
      switch (f.op) { case ':': case '=': return v === want; case '>': case '>=': return v >= want; case '<': case '<=': return v <= want; case '!=': return v !== want; default: return false; }
    }
    case 'pos': {
      const [x, y] = f.val.split(',').map(Number);
      if (!it.pos) return false;
      return (Number.isNaN(x) || it.pos.x === x) && (Number.isNaN(y) || it.pos.y === y);
    }
    case 'rarityname': return String(it.rarity) === f.val;
    default: return buildBlob(it).includes(f.val);
  }
}
function search (list, q) {
  const { terms, filters } = parseQuery(q || '');
  if (!terms.length && !filters.length) return list.slice();
  return list.filter((it) => {
    for (const f of filters) if (!matchFilter(it, f)) return false;
    if (terms.length) {
      const blob = buildBlob(it);
      for (const t of terms) if (!blob.includes(t)) return false;
    }
    return true;
  });
}

const RARITY = ['', '普通', '罕见', '稀有', '传奇'];
function sortItems (list, mode) {
  const arr = list.slice();
  const cmp = {
    order: (a, b) => (a.order - b.order) || a.id.localeCompare(b.id),
    orderDesc: (a, b) => (b.order - a.order) || a.id.localeCompare(b.id),
    name: (a, b) => nm(a).localeCompare(nm(b), 'zh'),
    cost: (a, b) => ((b.cost ?? -1) - (a.cost ?? -1)) || (a.order - b.order),
    rarity: (a, b) => ((a.rarity ?? 9) - (b.rarity ?? 9)) || (a.order - b.order),
    id: (a, b) => a.id.localeCompare(b.id),
    atlas: (a, b) => String(a.atlas).localeCompare(String(b.atlas)) || ((a.pos ? a.pos.y - b.pos.y : 0) || (a.pos ? a.pos.x - b.pos.x : 0)),
  }[mode] || null;
  if (cmp) arr.sort(cmp);
  return arr;
}

/* ---------------------------------------------------------------- export */
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32 (u8) { let c = 0xffffffff; for (let i = 0; i < u8.length; i++) c = CRC_T[(c ^ u8[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
const TE = new TextEncoder();

/** Minimal STORE-method ZIP writer (PNG payloads are already compressed). */
function zipStore (files) {
  const chunks = []; const central = []; let offset = 0;
  const dt = new Date();
  const dosTime = ((dt.getHours() << 11) | (dt.getMinutes() << 5) | (dt.getSeconds() >> 1)) & 0xffff;
  const dosDate = (((dt.getFullYear() - 1980) << 9) | ((dt.getMonth() + 1) << 5) | dt.getDate()) & 0xffff;
  for (const f of files) {
    const nameB = TE.encode(f.name);
    const data = f.data;
    const crc = crc32(data);
    const lh = new Uint8Array(30 + nameB.length);
    const dv = new DataView(lh.buffer);
    dv.setUint32(0, 0x04034b50, true); dv.setUint16(4, 20, true); dv.setUint16(6, 0x0800, true);
    dv.setUint16(8, 0, true); dv.setUint16(10, dosTime, true); dv.setUint16(12, dosDate, true);
    dv.setUint32(14, crc, true); dv.setUint32(18, data.length, true); dv.setUint32(22, data.length, true);
    dv.setUint16(26, nameB.length, true); dv.setUint16(28, 0, true);
    lh.set(nameB, 30);
    chunks.push(lh, data);
    const ch = new Uint8Array(46 + nameB.length);
    const cv = new DataView(ch.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true); cv.setUint16(10, 0, true); cv.setUint16(12, dosTime, true); cv.setUint16(14, dosDate, true);
    cv.setUint32(16, crc, true); cv.setUint32(20, data.length, true); cv.setUint32(24, data.length, true);
    cv.setUint16(28, nameB.length, true); cv.setUint16(30, 0, true); cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true); cv.setUint16(36, 0, true); cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    ch.set(nameB, 46);
    central.push(ch);
    offset += lh.length + data.length;
  }
  let cdSize = 0; for (const c of central) cdSize += c.length;
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true);
  ev.setUint32(12, cdSize, true); ev.setUint32(16, offset, true);
  const total = offset + cdSize + 22;
  const out = new Uint8Array(total);
  let p = 0;
  for (const c of chunks) { out.set(c, p); p += c.length; }
  for (const c of central) { out.set(c, p); p += c.length; }
  out.set(eocd, p);
  return out;
}
function canvasBytes (cv) {
  return new Promise((res, rej) => {
    if (!cv || !cv.width || !cv.height) { rej(new Error('画布尺寸是空的（' + (cv ? cv.width + '×' + cv.height : '没有画布') + '），导不出图')); return }
    let done = false;
    /* 宽度或高度为 0 的画布上，toBlob 的回调根本不会被调用（实测过），所以必须有兜底 */
    const timer = setTimeout(() => { if (!done) { done = true; rej(new Error('浏览器没能在 8 秒内把画布编码成 PNG')) } }, 8000);
    const finish = (fn, v) => { if (done) return; done = true; clearTimeout(timer); fn(v) };
    cv.toBlob((b) => {
      if (!b) { finish(rej, new Error('画布编码失败（浏览器返回了空结果）')); return }
      b.arrayBuffer().then((a) => finish(res, new Uint8Array(a)), (e) => finish(rej, e));
    }, 'image/png');
  });
}
function save (data, filename, type) {
  const blob = data instanceof Uint8Array ? new Blob([data], { type: type || 'application/octet-stream' }) : data;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
function toast (msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), 2200);
}
function safeName (s) { return String(s).replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_'); }

async function exportItemPNG (it, scale, plain) {
  const spec = specForItem(it);
  if (!spec) { toast('该项没有贴图'); return; }
  await ALL_READY; await ensureDrawn();
  const cv = compose(plain ? { center: spec.center, front: spec.front, back: spec.back, standalone: spec.standalone, highContrast: spec.highContrast } : spec, scale);
  save(await canvasBytes(cv), `${safeName(it.id)}_${safeName(nm(it))}_${scale}x.png`, 'image/png');
  toast(`已导出 ${scale}x PNG`);
}
function ensureDrawn () { return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); }

async function exportItemSVG (it, scale) {
  const spec = specForItem(it);
  await ALL_READY; await ensureDrawn();
  const cv = compose(spec, scale);
  const url = cv.toDataURL('image/png');
  const w = cv.width, h = cv.height;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<title>${esc(it.id)} · ${esc(nm(it))}</title>` +
    `<desc>Balatro asset ${esc(it.id)} (${esc(it.cat)}), tile ${it.pos ? it.pos.x + ',' + it.pos.y : '-'} @ ${esc(it.atlas || '-')}</desc>` +
    `<image width="${w}" height="${h}" image-rendering="pixelated" xlink:href="${url}" xmlns:xlink="http://www.w3.org/1999/xlink"/></svg>`;
  save(new Blob([svg], { type: 'image/svg+xml' }), `${safeName(it.id)}_${scale}x.svg`, 'image/svg+xml');
  toast('已导出 SVG');
}
function itemJSON (it) {
  return {
    id: it.id, category: it.cat, set: it.set, name: nm(it, 'en-us'), names: it.i18n,
    description: it.text, descriptionRaw: it.textRaw,
    sprite: { atlas: it.atlas, pos: it.pos, atlas_file: it.atlas && D.atlases[it.atlas] ? D.atlases[it.atlas].file : null, tile: { w: CARD_W, h: CARD_H } },
    data: {
      order: it.order, rarity: it.rarity, cost: it.cost, weight: it.weight, kind: it.kind,
      effect: it.effect, label: it.label, unlocked: it.unlocked, discovered: it.discovered,
      blueprint_compat: it.blueprint_compat, eternal_compat: it.eternal_compat, perishable_compat: it.perishable_compat,
      min_ante: it.min_ante, dollars: it.dollars, mult: it.mult, stake: it.stake, stake_level: it.stake_level,
      boss: it.boss, debuff: it.debuff, requires: it.requires, unlock_condition: it.unlock_condition,
      config: it.config,
    },
    raw: it.raw,
  };
}
function toCSV (list) {
  const cols = ['id', 'cat', 'set', 'name_en', 'name_zh', 'order', 'rarity', 'cost', 'weight', 'kind', 'effect', 'atlas', 'pos', 'unlocked', 'discovered', 'config'];
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
  const rows = [cols.join(',')];
  for (const it of list) {
    rows.push([
      it.id, it.cat, it.set, nm(it, 'en-us'), nm(it, 'zh_CN'), it.order, it.rarity ?? '', it.cost ?? '', it.weight ?? '',
      it.kind ?? '', it.effect ?? '', it.atlas ?? '', it.pos ? `${it.pos.x},${it.pos.y}` : '',
      it.unlocked ?? '', it.discovered ?? '', JSON.stringify(it.config || {}),
    ].map(q).join(','));
  }
  return rows.join('\r\n');
}
function downloadText (text, filename, type) { save(new Blob(['\ufeff' + text], { type: type || 'text/plain;charset=utf-8' }), filename); }

/* ------------------------------------------------------- animation / APNG */
const ANIM_FPS = 20;
/**
 * Build one loop of an animated effect.
 *
 * Two things made the first version feel wrong: the game's shimmers run on very slow
 * cycles (the foil sweep alone is a ~25-90 s pattern), so 2 s of real time barely moved,
 * and jumping from the last frame back to the first was a visible cut.
 *
 * Fixes: a time multiplier (speed) so a whole sweep fits into a few seconds, and a
 * ping-pong loop — forward through the frames then back — which is seamless by
 * construction because the step across the loop point equals every other step.
 */
function buildAnimFrames (spec, scale, opts) {
  opts = opts || {};
  const fps = opts.fps || ANIM_FPS;
  const speed = opts.speed || 1;
  const seconds = opts.seconds || 2.5;
  const pingpong = opts.pingpong !== false;
  const n = Math.max(3, Math.round(fps * seconds));
  const dt = speed / fps; // game-seconds per frame
  const frames = [];
  for (let i = 0; i < n; i++) frames.push(compose(spec, scale, i * dt));
  if (pingpong) for (let i = n - 2; i >= 1; i--) frames.push(compose(spec, scale, i * dt));
  return { frames, delay: Math.round(1000 / fps) };
}
/** BlindChips is a 21-frame atlas; the pose repeats, and a forward loop is already seamless. */
function blindAnimFrames (it, scale) {
  const total = (atlas('blind_chips') || {}).frames || 21;
  const all = [];
  for (let i = 0; i < total; i++) all.push(compose({ standalone: { atlas: 'blind_chips', pos: { x: i, y: it.pos.y } } }, scale, phaseNow()));
  return { frames: collapseFrames(all), delay: 110 };
}
/** Mean per-pixel difference between two canvases, 0..1 of full scale. */
function frameDiff (a, b) {
  const da = a.getContext('2d').getImageData(0, 0, a.width, a.height).data;
  const db = b.getContext('2d').getImageData(0, 0, b.width, b.height).data;
  let sum = 0; let n = 0;
  for (let i = 0; i < da.length; i += 4) {
    sum += Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) + Math.abs(da[i + 3] - db[i + 3]);
    n += 4;
  }
  return sum / (n * 255);
}
/** How bad is the loop seam, relative to a normal frame-to-frame step? 1 = perfect. */
function loopSeamRatio (frames) {
  if (!frames || frames.length < 3) return null;
  const seam = frameDiff(frames[frames.length - 1], frames[0]);
  let acc = 0;
  for (let i = 0; i < frames.length - 1; i++) acc += frameDiff(frames[i], frames[i + 1]);
  const avg = acc / (frames.length - 1);
  return { seam, avg, ratio: avg > 0 ? seam / avg : 1 };
}
/* ------------------------------------------------------------ loop finding
 * Game effects are sums of sines driven by G.TIMERS.REAL, so a card really does repeat —
 * but only after the least common multiple of every term's period, which the source gives us:
 * a term like cos(t/53.1532) has period 2π·53.1532. Those are astronomically long on their own,
 * so the candidates are used as *hints* and each one is verified by rendering.
 * ------------------------------------------------------------------------- */
const TWO_PI = Math.PI * 2;

/** Candidate periods (seconds) suggested by the shader sources a spec uses. */
function sourcePeriodHints (src) {
  const out = [];
  // cos(t/53.1532) / sin(-t / 143.634) — a divisor under a trig term is a period in radians
  for (const m of src.matchAll(/(?:sin|cos)\s*\(\s*[-+]?\s*[A-Za-z_][\w.]*\s*\/\s*([\d.]+)/g)) {
    const v = parseFloat(m[1]);
    if (v > 0.01) out.push(TWO_PI * v);
  }
  // uPhase.x*2.612 style: uPhase.x is REAL/28, so the angular rate is k/28
  for (const m of src.matchAll(/u?Phase\.x\s*\*\s*([\d.]+)/g)) {
    const v = parseFloat(m[1]);
    if (v > 0.0001) out.push(TWO_PI * 28 / v);
  }
  for (const m of src.matchAll(/(?:uPhase|time|hologram\.g|foil\.y|holo\.y)\.y\s*\*\s*([\d.]+)/g)) {
    const v = parseFloat(m[1]);
    if (v > 0.0001) out.push(TWO_PI / v);
  }
  return out;
}
/** Periods the floating-art animation itself uses (Card:draw soul_pos branch). */
const SOUL_PERIODS = [TWO_PI / 1.8, TWO_PI / 1.219];

/** Which shader programs this spec actually runs. */
function specShaderKeys (spec) {
  const keys = new Set();
  if (!spec) return keys;
  if (spec.setShader) keys.add(spec.setShader);
  if (spec.edition && spec.edition !== 'e_negative') keys.add(EDITION_SHADER[spec.edition] || spec.edition);
  if (spec.edition === 'e_negative') { keys.add('negative'); keys.add('negative_shine'); }
  if (spec.soul) keys.add(spec.soulHologram ? 'hologram' : 'dissolve');
  for (const st of (spec.stickers || (spec.sticker ? [spec.sticker] : []))) keys.add('voucher');
  if (spec.seal === 'Gold') keys.add('voucher');
  return keys;
}
function shaderSourceOf (key) {
  if (MOD_SHADERS[key]) return MOD_SHADERS[key];
  const sh = D.shaders.find((x) => x.name === key);
  return sh ? sh.source : '';
}
/** Mean disagreement between the animation at t and at t + period. */
function loopError (spec, period, samples) {
  let sum = 0;
  for (const t of samples) sum += frameDiff(compose(spec, 1, t), compose(spec, 1, t + period));
  return sum / samples.length;
}
const periodCache = new Map();
const specKey = (spec) => JSON.stringify([spec.center, spec.front, spec.edition, spec.setShader, spec.soul, spec.soulHologram, spec.stickers, spec.sticker, spec.seal]);

/**
 * Smallest period at which the card visibly repeats, or null when none is found within
 * `maxSeconds`. Candidates come from the shader source; each is verified by rendering.
 */
function detectPeriod (spec, maxSeconds) {
  maxSeconds = maxSeconds || 40;
  const ck = specKey(spec);
  if (periodCache.has(ck)) return periodCache.get(ck);
  let best = null;
  try {
    const hints = new Set();
    for (const k of specShaderKeys(spec)) {
      if (k === 'dissolve') continue;
      for (const p of sourcePeriodHints(shaderSourceOf(k))) hints.add(p);
    }
    if (spec.soul) for (const p of SOUL_PERIODS) hints.add(p);
    if (!hints.size) { periodCache.set(ck, null); return null }
    // a period may be any multiple of the base frequencies
    const cands = new Set();
    for (const p of hints) {
      if (!(p > 0.05)) continue;
      for (let n = 1; n <= 12; n++) {
        const v = p * n;
        if (v <= maxSeconds) cands.add(Math.round(v * 1000) / 1000);
      }
    }
    const list = [...cands].sort((a, b) => a - b).slice(0, 60);
    const samples = [0, 0.37, 1.11];
    // A loop is seamless when its seam is no worse than one ordinary frame step at the current
    // fps/speed — the same yardstick the seam ratio uses. Exact equality is far too strict:
    // the floating-art terms 2π/1.8 and 2π/1.219 only line up approximately (≈10.47s).
    const dt = (S.anim.speed || 1) / (S.anim.fps || 20);
    let step = 0;
    for (const t of [0, 1.3]) step += frameDiff(compose(spec, 1, t), compose(spec, 1, t + dt));
    step = Math.max(1e-4, step / 2);
    const tol = Math.max(step * 1.3, 0.0015);
    for (const p of list) {
      const e = loopError(spec, p, samples);
      if (e <= tol) { best = p; break }
    }
  } catch (e) { best = null }
  periodCache.set(ck, best);
  return best;
}

const LOOP_MODES = [
  ['auto', '🔁 循环：自动找循环点'],
  ['pingpong', '↔ 循环：来回（无接缝）'],
  ['forward', '→ 循环：单向'],
];
const loopLabel = () => (LOOP_MODES.find((m) => m[0] === (S.anim.loop || 'auto')) || LOOP_MODES[0])[1];
const cycleLoop = () => {
  const i = LOOP_MODES.findIndex((m) => m[0] === (S.anim.loop || 'auto'));
  S.anim.loop = LOOP_MODES[(i + 1) % LOOP_MODES.length][0];
  S.anim.pingpong = S.anim.loop !== 'forward';
  return S.anim.loop;
};

/** Current animation settings, shared by the forge and the detail panel. */
function animOpts (spec) {
  const base = { fps: S.anim.fps, speed: S.anim.speed, seconds: S.anim.seconds, pingpong: S.anim.pingpong };
  const mode = S.anim.loop || 'auto';
  if (mode === 'forward') { base.pingpong = false; return base }
  if (mode === 'pingpong') { base.pingpong = true; return base }
  // auto: use the detected loop when there is one, so the export repeats exactly
  if (!spec) return base;
  const p = detectPeriod(spec);
  if (p) {
    base.pingpong = false;
    base.period = p;
    base.seconds = Math.max(0.4, Math.min(30, p / (base.speed || 1)));
    base.autoPeriod = p;
  }
  return base;
}
/** If the menu selection changes, any in-flight animation must restart from frame 0. */
function renderAnim (spec, scale, done, fps, seconds) {
  const r = buildAnimFrames(spec, scale, Object.assign(animOpts(spec), { fps: fps || S.anim.fps, seconds: seconds || S.anim.seconds }));
  done(r.frames, r.delay);
}
function canvasPngBytes (cv) {
  return new Promise((res) => cv.toBlob((b) => b.arrayBuffer().then((a) => res(new Uint8Array(a))), 'image/png'));
}
function pngChunk (type, data) {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}
function parsePngChunks (u8) {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const out = [];
  let p = 8;
  while (p + 8 <= u8.length) {
    const len = dv.getUint32(p);
    const type = String.fromCharCode(u8[p + 4], u8[p + 5], u8[p + 6], u8[p + 7]);
    out.push({ type, data: u8.subarray(p + 8, p + 8 + len) });
    p += 12 + len;
    if (type === 'IEND') break;
  }
  return out;
}
/**
 * Build an APNG (.png with acTL/fcTL/fdAT) out of full frames. APNG is used instead of
 * GIF so the cards keep their alpha channel and full colour.
 */
async function encodeAPNG (frames, delayMs) {
  if (!frames.length) return null;
  const pngs = [];
  for (const f of frames) pngs.push(await canvasPngBytes(f));
  const first = parsePngChunks(pngs[0]);
  const ihdr = first.find((c) => c.type === 'IHDR');
  const hv = new DataView(ihdr.data.buffer, ihdr.data.byteOffset, 8);
  const W = hv.getUint32(0); const H = hv.getUint32(4);
  const parts = [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])];
  parts.push(pngChunk('IHDR', ihdr.data));
  const actl = new Uint8Array(8);
  const av = new DataView(actl.buffer);
  av.setUint32(0, frames.length); av.setUint32(4, 0); // 0 plays = loop forever
  parts.push(pngChunk('acTL', actl));
  let seq = 0;
  const fcTL = () => {
    const b = new Uint8Array(26);
    const v = new DataView(b.buffer);
    v.setUint32(0, seq++);
    v.setUint32(4, W); v.setUint32(8, H);
    v.setUint32(12, 0); v.setUint32(16, 0);
    v.setUint16(20, delayMs); v.setUint16(22, 1000);
    b[24] = 0; // dispose: none
    b[25] = 0; // blend: source (full frames overwrite)
    return b;
  };
  parts.push(pngChunk('fcTL', fcTL()));
  for (const c of first) if (c.type === 'IDAT') parts.push(pngChunk('IDAT', c.data));
  for (let i = 1; i < pngs.length; i++) {
    const cs = parsePngChunks(pngs[i]);
    parts.push(pngChunk('fcTL', fcTL()));
    for (const c of cs) {
      if (c.type !== 'IDAT') continue;
      const d = new Uint8Array(4 + c.data.length);
      new DataView(d.buffer).setUint32(0, seq++);
      d.set(c.data, 4);
      parts.push(pngChunk('fdAT', d));
    }
  }
  parts.push(pngChunk('IEND', new Uint8Array(0)));
  let total = 0;
  for (const p of parts) total += p.length;
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
async function saveAnimAPNG (frames, delayMs, filename) {
  const bytes = await encodeAPNG(frames, delayMs);
  if (!bytes) { toast('动画生成失败'); return; }
  save(bytes, filename, 'image/png');
  toast(`已导出动图：${frames.length} 帧 / ${(bytes.length / 1024).toFixed(0)} KB`);
}
async function saveFrameZip (frames, delayMs, filename) {
  const enc = new TextEncoder();
  const files = [];
  for (let i = 0; i < frames.length; i++) files.push({ name: `frame_${String(i).padStart(3, '0')}.png`, data: await canvasPngBytes(frames[i]) });
  files.push({ name: 'README.txt', data: enc.encode(
    'Balatro 动画帧序列\r\n==================\r\n' +
    `帧数: ${frames.length}\r\n帧率: ${Math.round(1000 / delayMs)} fps\r\n时长: ${(frames.length * delayMs / 1000).toFixed(2)} 秒（循环）\r\n` +
    `导出时间: ${new Date().toLocaleString()}\r\n\r\n` +
    '每帧为 142×190 的透明背景 PNG，可直接导入 PR / AE / Aseprite 合成视频或 GIF。\r\n') });
  save(zipStore(files), filename, 'application/zip');
  toast(`已导出 ${frames.length} 帧 → ZIP`);
}

/* ------------------------------------------------------------------ GIF89a
 * APNG keeps full colour and alpha but only browsers animate it — Windows'
 * built-in photo viewer just shows frame 1. GIF plays everywhere, so we ship
 * both. 256 colours is a hard GIF limit, so the palette comes from either an
 * exact colour list (pixel art usually fits) or median-cut quantisation.
 */
function medianCutPalette (colors, maxColors) {
  let boxes = [colors];
  while (boxes.length < maxColors) {
    let pick = -1; let bestScore = -1;
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      if (b.length < 2) continue;
      let mn0 = 255; let mn1 = 255; let mn2 = 255; let mx0 = 0; let mx1 = 0; let mx2 = 0; let n = 0;
      for (const c of b) {
        const r = c.rgb[0]; const g = c.rgb[1]; const bl = c.rgb[2];
        if (r < mn0) mn0 = r; if (r > mx0) mx0 = r;
        if (g < mn1) mn1 = g; if (g > mx1) mx1 = g;
        if (bl < mn2) mn2 = bl; if (bl > mx2) mx2 = bl;
        n += c.n;
      }
      const range = Math.max(mx0 - mn0, mx1 - mn1, mx2 - mn2);
      const score = range * Math.log(1 + n);
      if (score > bestScore) { bestScore = score; pick = i; }
    }
    if (pick < 0) break;
    const b = boxes[pick];
    let mn = [255, 255, 255]; const mx = [0, 0, 0];
    for (const c of b) for (let k = 0; k < 3; k++) { if (c.rgb[k] < mn[k]) mn[k] = c.rgb[k]; if (c.rgb[k] > mx[k]) mx[k] = c.rgb[k] }
    let axis = 0; let best = -1;
    for (let k = 0; k < 3; k++) { const r = mx[k] - mn[k]; if (r > best) { best = r; axis = k } }
    b.sort((x, y) => x.rgb[axis] - y.rgb[axis]);
    let total = 0; for (const c of b) total += c.n;
    let acc = 0; let si = 1;
    for (let i = 0; i < b.length - 1; i++) { acc += b[i].n; if (acc >= total / 2) { si = i + 1; break } }
    boxes.splice(pick, 1, b.slice(0, si), b.slice(si));
    mn = null;
  }
  return boxes.map((b) => {
    let r = 0; let g = 0; let bl = 0; let n = 0;
    for (const c of b) { r += c.rgb[0] * c.n; g += c.rgb[1] * c.n; bl += c.rgb[2] * c.n; n += c.n }
    return [Math.round(r / n), Math.round(g / n), Math.round(bl / n)];
  });
}
/**
 * A few Lloyd (k-means) iterations on top of the median-cut result: every palette entry moves to
 * the weighted mean of the colours that map to it. Cheap on a capped histogram, and it visibly
 * cleans up the smooth gradients the shader effects produce.
 */
function refinePalette (colors, palette, iterations) {
  let cur = palette.map((c) => c.slice());
  const step = colors.length > 4096 ? Math.ceil(colors.length / 4096) : 1;
  const sample = step > 1 ? colors.filter((_, i) => i % step === 0) : colors;
  for (let it = 0; it < iterations; it++) {
    const acc = cur.map(() => [0, 0, 0, 0]);
    for (const c of sample) {
      let bi = 0; let bd = Infinity;
      for (let i = 0; i < cur.length; i++) {
        const p = cur[i];
        const dr = c.rgb[0] - p[0]; const dg = c.rgb[1] - p[1]; const db = c.rgb[2] - p[2];
        const d = dr * dr * 0.299 + dg * dg * 0.587 + db * db * 0.114;
        if (d < bd) { bd = d; bi = i }
      }
      const a = acc[bi];
      a[0] += c.rgb[0] * c.n; a[1] += c.rgb[1] * c.n; a[2] += c.rgb[2] * c.n; a[3] += c.n;
    }
    cur = acc.map((a, i) => (a[3] > 0
      ? [Math.round(a[0] / a[3]), Math.round(a[1] / a[3]), Math.round(a[2] / a[3])]
      : cur[i]));
  }
  return cur;
}

/**
 * Floyd–Steinberg error diffusion. GIF has 256 colours at most, and these shader gradients band
 * badly without it; with it the eye blends neighbouring pixels back into the missing colours.
 */
function ditherFrame (data, W, H, palette, nearest, colorBase, transparentIndex, bg) {
  const out = new Uint8Array(W * H);
  const e0 = new Float32Array((W + 2) * 3);
  const e1 = new Float32Array((W + 2) * 3);
  const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
  for (let y = 0; y < H; y++) {
    e1.fill(0);
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const alpha = data[i + 3];
      if (bg === null && alpha < 128) { out[y * W + x] = transparentIndex; continue }
      let r = data[i]; let g = data[i + 1]; let b = data[i + 2];
      if (bg !== null) {
        const af = alpha / 255;
        r = r * af + bg[0] * (1 - af); g = g * af + bg[1] * (1 - af); b = b * af + bg[2] * (1 - af);
      }
      const o = (x + 1) * 3;
      r = clamp(Math.round(r + e0[o]));
      g = clamp(Math.round(g + e0[o + 1]));
      b = clamp(Math.round(b + e0[o + 2]));
      const pi = nearest(r, g, b);
      out[y * W + x] = colorBase + pi;
      const c = palette[pi];
      const dr = r - c[0]; const dg = g - c[1]; const db = b - c[2];
      e0[o + 3] += dr * 0.4375; e0[o + 4] += dg * 0.4375; e0[o + 5] += db * 0.4375;
      e1[o - 3] += dr * 0.1875; e1[o - 2] += dg * 0.1875; e1[o - 1] += db * 0.1875;
      e1[o] += dr * 0.3125; e1[o + 1] += dg * 0.3125; e1[o + 2] += db * 0.3125;
      e1[o + 3] += dr * 0.0625; e1[o + 4] += dg * 0.0625; e1[o + 5] += db * 0.0625;
    }
    e0.set(e1);
  }
  return out;
}

/** Build a palette (list of rgb triplets) plus a nearest-colour cache. */
function buildGifPalette (frames, bg, maxColors, refine) {
  const hist = new Map();
  for (const d of frames) {
    for (let i = 0; i < d.length; i += 4) {
      if (bg === null && d[i + 3] < 128) continue;
      let r; let g; let b;
      if (bg === null) { r = d[i]; g = d[i + 1]; b = d[i + 2] } else {
        const a = d[i + 3] / 255;
        r = Math.round(d[i] * a + bg[0] * (1 - a));
        g = Math.round(d[i + 1] * a + bg[1] * (1 - a));
        b = Math.round(d[i + 2] * a + bg[2] * (1 - a));
      }
      const key = (r << 16) | (g << 8) | b;
      const e = hist.get(key);
      if (e) e.n++; else hist.set(key, { rgb: [r, g, b], n: 1 });
    }
  }
  const list = [...hist.values()].sort((a, b) => b.n - a.n);
  let palette;
  if (list.length <= maxColors) palette = list.map((c) => c.rgb);
  else {
    palette = medianCutPalette(list, maxColors);
    // k-means polish: median-cut boxes are axis-aligned, this pulls the entries onto the
    // real colour clusters
    if (refine !== false && palette.length > 2) palette = refinePalette(list, palette, 4);
  }
  if (!palette.length) palette = [[0, 0, 0]];
  const cache = new Map();
  const nearest = (r, g, b) => {
    const key = (r << 16) | (g << 8) | b;
    const hit = cache.get(key);
    if (hit !== undefined) return hit;
    let bi = 0; let bd = Infinity;
    for (let i = 0; i < palette.length; i++) {
      const p = palette[i];
      const dr = p[0] - r; const dg = p[1] - g; const db = p[2] - b;
      const d = dr * dr * 0.299 + dg * dg * 0.587 + db * db * 0.114;
      if (d < bd) { bd = d; bi = i; if (!d) break }
    }
    cache.set(key, bi);
    return bi;
  };
  return { palette, nearest };
}
function lzwEncode (indices, minCodeSize) {
  const out = [];
  let cur = 0; let curBits = 0;
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;
  let codeSize = minCodeSize + 1;
  let nextCode = eoiCode + 1;
  let dict = new Map();
  const emit = (code) => {
    cur |= code << curBits; curBits += codeSize;
    while (curBits >= 8) { out.push(cur & 0xff); cur >>>= 8; curBits -= 8 }
  };
  emit(clearCode);
  let prefix = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i];
    const key = (prefix << 8) | k;
    const found = dict.get(key);
    if (found !== undefined) { prefix = found; continue }
    emit(prefix);
    if (nextCode === 4096) { emit(clearCode); dict = new Map(); nextCode = eoiCode + 1; codeSize = minCodeSize + 1; } else {
      if (nextCode >= (1 << codeSize)) codeSize++;
      dict.set(key, nextCode++);
    }
    prefix = k;
  }
  emit(prefix);
  emit(eoiCode);
  if (curBits > 0) out.push(cur & 0xff);
  return new Uint8Array(out);
}
/** Encode canvases into an animated GIF89a. bg = null keeps transparency. */
function encodeGIF (frames, delayMs, bg, opts) {
  opts = opts || {};
  const want = opts.colors || 256;
  const W = frames[0].width; const H = frames[0].height;
  const datas = frames.map((f) => f.getContext('2d').getImageData(0, 0, W, H).data);
  // index 0 is reserved for transparency, so the rest of the table is what is left
  const maxColors = Math.min(want, bg === null ? 255 : 256);
  const { palette, nearest } = buildGifPalette(datas, bg, maxColors, opts.refine);
  const globalTable = bg === null ? [[0, 0, 0], ...palette] : palette;
  let gctBits = 1; while ((1 << gctBits) < globalTable.length) gctBits++;
  if (gctBits > 8) gctBits = 8;
  const gctSize = 1 << gctBits;
  const transparentIndex = bg === null ? 0 : -1;
  const colorBase = bg === null ? 1 : 0;

  const bytes = [];
  const push = (...v) => { for (const x of v) bytes.push(x & 0xff) };
  const pushStr = (s) => { for (let i = 0; i < s.length; i++) bytes.push(s.charCodeAt(i)) };
  const push16 = (v) => { bytes.push(v & 0xff, (v >> 8) & 0xff) };

  pushStr('GIF89a');
  push16(W); push16(H);
  push(0x80 | ((gctBits - 1) << 4) | (gctBits - 1), 0, 0); // global table, colour res, size
  for (let i = 0; i < gctSize; i++) { const c = globalTable[i] || [0, 0, 0]; push(c[0], c[1], c[2]) }
  // NETSCAPE looping extension
  push(0x21, 0xff, 0x0b); pushStr('NETSCAPE2.0'); push(0x03, 0x01); push16(0); push(0);

  const delay = Math.max(2, Math.round(delayMs / 10));
  const dither = opts.dither !== false;
  for (let fi = 0; fi < datas.length; fi++) {
    const d = datas[fi];
    // Floyd–Steinberg when enabled: 256 colours band badly on these gradients without it
    const indices = dither
      ? ditherFrame(d, W, H, palette, nearest, colorBase, transparentIndex, bg)
      : (() => {
          const idx = new Uint8Array(W * H);
          for (let i = 0, p = 0; i < d.length; i += 4, p++) {
            const a = d[i + 3];
            if (bg === null) {
              if (a < 128) { idx[p] = transparentIndex; continue }
              idx[p] = colorBase + nearest(d[i], d[i + 1], d[i + 2]);
            } else {
              const af = a / 255;
              idx[p] = nearest(
                Math.round(d[i] * af + bg[0] * (1 - af)),
                Math.round(d[i + 1] * af + bg[1] * (1 - af)),
                Math.round(d[i + 2] * af + bg[2] * (1 - af)));
            }
          }
          return idx;
        })();
    // graphic control extension
    push(0x21, 0xf9, 0x04, (2 << 2) | (transparentIndex >= 0 ? 1 : 0));
    push16(delay);
    push(transparentIndex >= 0 ? transparentIndex : 0, 0);
    // image descriptor
    push(0x2c); push16(0); push16(0); push16(W); push16(H); push(0);
    const lzw = lzwEncode(indices, 8);
    push(8);
    for (let i = 0; i < lzw.length; i += 255) {
      const n = Math.min(255, lzw.length - i);
      push(n);
      for (let k = 0; k < n; k++) bytes.push(lzw[i + k]);
    }
    push(0);
  }
  return new Uint8Array(bytes);
}
async function saveAnimGIF (frames, delayMs, filename, bg) {
  // GIF gets big fast: halve the frame count (doubling the delay) beyond 24 frames.
  let f = frames;
  let d = delayMs;
  while (f.length > 40) { f = f.filter((_, i) => i % 2 === 0); d *= 2 }
  const bytes = encodeGIF(f, d, bg, { colors: S.gifColors, dither: S.gifDither });
  save(bytes, filename, 'image/gif');
  toast(`已导出 GIF：${f.length} 帧 / ${(bytes.length / 1024).toFixed(0)} KB`);
}
/** Does this catalogue entry have anything that actually moves? */
function hasAnim (it) {
  const s = specForItem(it);
  if (!s) return false;
  if (s.standalone) return s.standalone.atlas === 'blind_chips';
  const st = s.stickers || (s.sticker ? [s.sticker] : []);
  return !!(s.edition || s.setShader || s.soul || st.length || s.seal === 'Gold');
}
/** BlindChips holds one pose for most of its 21 frames; drop the duplicates for export. */
function collapseFrames (frames) {
  const out = [];
  let last = null;
  for (const f of frames) {
    const h = quickHash(f);
    if (h === last) continue;
    last = h;
    out.push(f);
  }
  return out.length ? out : frames;
}
function quickHash (cv) {
  const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
  let h = 2166136261;
  for (let i = 0; i < d.length; i += 7) { h ^= d[i]; h = Math.imul(h, 16777619) >>> 0; }
  return h;
}

/* ------------------------------------------------------------- rendering */
const IO = ('IntersectionObserver' in window)
  ? new IntersectionObserver((es) => { for (const e of es) { if (e.isIntersecting) { const f = e.target._paint; if (f) { f(); } IO.unobserve(e.target); } } }, { rootMargin: '300px' })
  : null;
/** Aspect-preserving display width so bigger boxes (boosters) really look bigger. */
const previewWidth = (cv, base) => Math.round((base || 110) * cv.width / (CARD_W * 3));
function paintInto (cv, spec, scale) {
  const src = compose(spec, scale);
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.imageSmoothingEnabled = false;
  const r = Math.min(cv.width / src.width, cv.height / src.height);
  const w = src.width * r, h = src.height * r;
  ctx.drawImage(src, (cv.width - w) / 2, (cv.height - h) / 2, w, h);
}

function cellEl (it) {
  const el = document.createElement('div');
  el.className = 'cell' + (S.sel === it.id ? ' on' : '');
  el.dataset.id = it.id;
  const spec = specForItem(it);
  const box = document.createElement('div');
  box.style.height = '96px'; box.style.display = 'flex'; box.style.alignItems = 'center'; box.style.justifyContent = 'center';
  el.appendChild(box);
  let painted = false;
  const paint = () => { if (painted || !spec) return; painted = true; const cv = newCanvas(CARD_W * 2, CARD_H * 2); paintInto(cv, spec, 2); cv.style.width = '71px'; cv.style.height = '95px'; box.innerHTML = ''; box.appendChild(cv); };
  if (spec) {
    const ph = document.createElement('div');
    ph.style.cssText = 'width:71px;height:95px;border-radius:4px;background:#1a242e';
    box.appendChild(ph);
    if (IO) { el._paint = paint; IO.observe(el); } else paint();
  } else {
    box.innerHTML = '<div style="font-size:26px;opacity:.35">◈</div>';
  }
  const n = document.createElement('div'); n.className = 'nm'; n.textContent = nm(it); n.title = nm(it);
  const m = document.createElement('div'); m.className = 'meta';
  m.textContent = [it.rarity ? RARITY[it.rarity] : null, it.cost != null ? '$' + it.cost : null, it.kind || null].filter(Boolean).join(' · ') || it.id;
  const b = document.createElement('div'); b.className = 'badge'; b.textContent = categoryLabel(it.cat);
  el.appendChild(n); el.appendChild(m); el.appendChild(b);
  if (it.source) {
    const md = document.createElement('div'); md.className = 'modtag';
    md.textContent = 'MOD'; md.title = (it.sourceName || it.source) + ' · ' + it.id;
    el.appendChild(md);
  }
  if (it.boss_colour) {
    const e = document.createElement('div'); e.className = 'eyebrow'; e.textContent = 'BOSS';
    e.style.color = it.boss_colour.hex || ''; if (it.source) e.style.top = '22px'; el.appendChild(e);
  }
  el.onclick = () => selectItem(it.id);
  return el;
}

/* ------------------------------------------------------------- sidebar */
const CATS = [
  ['all', '全部', '✦'], ['Joker', '小丑牌', '♣'], ['Tarot', '塔罗牌', '✧'], ['Planet', '星球牌', '◉'],
  ['Spectral', '幽灵牌', '☾'], ['Voucher', '优惠券', '❖'], ['Booster', '补充包', '▣'], ['Deck', '牌组', '▤'],
  ['Enhancement', '强化牌', '◆'], ['Edition', '版本/闪卡', '✶'], ['Seal', '蜡封', 'Ⓢ'], ['Sticker', '贴纸', '★'],
  ['Tag', '标签', '▸'], ['Blind', '盲注', '☠'], ['Stake', '底注/筹码', '⬢'],
  ['PlayingCard', '扑克牌', '🂡'], ['Collab', '联动牌面', '⇄'], ['Overlay', '叠加层', '⁂'],
  ['Base', '底框', '▢'], ['Other', '其它', '·'],
  ['Challenge', '挑战', '⚑'],
];
function renderSidebar () {
  const sb = document.getElementById('sidebar');
  sb.innerHTML = '';
  const group = (label) => { const g = document.createElement('div'); g.className = 'catgroup'; g.textContent = label; sb.appendChild(g) };
  const row = (name, icon, n, active, onclick, title, catKey) => {
    const el = document.createElement('div');
    el.className = 'cat' + (active ? ' on' : '');
    if (catKey) el.dataset.cat = catKey;   /* 原版收藏页里塔罗/星球/幽灵各有自己的颜色 */
    el.innerHTML = `<span class="k">${icon}</span><span>${esc(name)}</span>${n == null ? '' : `<span class="cnt">${n}</span>`}`;
    if (title) el.title = title;
    el.onclick = onclick;
    sb.appendChild(el);
    return el;
  };
  const pickCat = (key) => () => { S.cat = key; S.tab = 'codex'; closeDrawers(); render() };
  const pickTool = (k) => () => { S.tab = k; closeDrawers(); render() };
  const pickSource = (src) => () => { S.source = src; S.cat = 'all'; S.tab = 'codex'; S.sel = null; closeDrawers(); render() };

  const base = sourceItems();
  const per = (k) => base.filter((i) => i.cat === k).length;
  const knownCat = new Set(CATS.map((c) => c[0]));

  group('图鉴');
  row('全部', '✦', base.length, S.cat === 'all', pickCat('all'));
  for (const [label, cats] of [['卡牌与消耗品', CATS.slice(1, 6)], ['牌组与强化', CATS.slice(6, 13)], ['其它资源', CATS.slice(13)]]) {
    const visible = cats.filter(([k]) => per(k) > 0);
    if (!visible.length) continue;
    group(label);
    for (const [key, name, icon] of visible) row(name, icon, per(key), S.cat === key, pickCat(key), null, key);
  }
  const extra = [...new Set(base.map((i) => i.cat))].filter((k) => !knownCat.has(k)).sort();
  if (extra.length) {
    group('Mod 新增类型');
    for (const k of extra) row(categoryLabel(k), '◇', per(k), S.cat === k, pickCat(k), k);
  }
  if (MODS.length) {
    group('来源');
    row('全部来源', '∑', ITEMS.length, S.source === 'all', pickSource('all'));
    row('原版 Balatro', '◈', ITEMS.filter((i) => !i.source).length, S.source === 'vanilla', pickSource('vanilla'));
    for (const m of MODS) row(m.name, '⊕', ITEMS.filter((i) => i.source === m.id).length, S.source === m.id, pickSource(m.id), m.id);
  }
  group('工具');
  for (const [k, label, icon] of [['forge', '卡牌合成台', '⚒'], ['score', '得分计算器', '🧮'], ['maker', 'Mod 制作器', '🛠'], ['atlas', '图集浏览', '▦'], ['hands', '牌型数据', '♠'], ['shaders', '着色器', '✦'], ['data', '数据总表', '▤'], ['mods', '导入 Mod', '⊕']]) {
    row(label, icon, k === 'mods' && MODS.length ? MODS.length : null, S.tab === k, pickTool(k));
  }
}

/* ------------------------------------------------------------- views */
function currentList () {
  const base = sourceItems();
  let list = S.cat === 'all' ? base : base.filter((i) => i.cat === S.cat);
  list = search(list, S.q);
  return sortItems(list, S.sort);
}

function viewCodex (root) {
  const list = currentList();
  const head = document.createElement('div');
  head.className = 'listhead';
  head.innerHTML = `<h2>${(CATS.find((c) => c[0] === S.cat) || [, '全部'])[1]}</h2>` +
    `<span class="sub">${list.length} / ${ITEMS.length} 项</span><span class="spacer"></span>`;
  if (S.source !== 'all') {
    // the source filter is a shortcut, so make the way back just as short
    const mod = MODS.find((m) => m.id === S.source);
    const chip = document.createElement('button');
    chip.className = 'tbtn srcchip';
    chip.innerHTML = `来源：<b>${esc(S.source === 'vanilla' ? '原版 Balatro' : (mod ? mod.name : S.source))}</b> <span class="x">✕</span>`;
    chip.title = '清除来源筛选，显示全部条目';
    chip.onclick = () => { S.source = 'all'; S.cat = 'all'; render(); toast('已显示全部来源') };
    head.appendChild(chip);
  }
  const sel = document.createElement('select'); sel.className = 'tbtn';
  for (const [v, t] of [['order', '游戏顺序'], ['orderDesc', '逆序'], ['name', '名称'], ['cost', '费用'], ['rarity', '稀有度'], ['id', 'ID'], ['atlas', '图集位置']]) {
    const o = document.createElement('option'); o.value = v; o.textContent = '排序：' + t; if (S.sort === v) o.selected = true; sel.appendChild(o);
  }
  sel.onchange = () => { S.sort = sel.value; render(); };
  head.appendChild(sel);
  const exp = document.createElement('button'); exp.className = 'tbtn'; exp.textContent = '⤓ 导出当前结果';
  exp.onclick = () => exportList(list);
  head.appendChild(exp);
  root.appendChild(head);

  if (!list.length) { root.appendChild(Object.assign(document.createElement('div'), { className: 'empty-note', textContent: '没有匹配的条目，试试搜索别的关键词。' })); return; }
  const grid = document.createElement('div');
  grid.className = 'grid' + (S.view === 'small' ? ' small' : S.view === 'large' ? ' large' : '');
  for (const it of list) grid.appendChild(cellEl(it));
  root.appendChild(grid);
}

async function exportList (list) {
  toast(`正在打包 ${list.length} 项…`);
  await ALL_READY;
  const files = [];
  const manifest = [];
  for (const it of list) {
    const spec = specForItem(it);
    if (!spec) continue;
    const cv = compose(spec, 2);
    await ensureDrawn();
    files.push({ name: `png/${safeName(it.cat)}/${safeName(it.id)}.png`, data: await canvasBytes(cv) });
    manifest.push(itemJSON(it));
  }
  const enc = new TextEncoder();
  files.push({ name: 'manifest.json', data: enc.encode(JSON.stringify({ meta: D.meta, count: manifest.length, items: manifest }, null, 1)) });
  files.push({ name: 'data.csv', data: new TextEncoder().encode('\ufeff' + toCSV(list)) });
  files.push({ name: 'README.txt', data: enc.encode(
    'Balatro 素材导出包\r\n' +
    '================\r\n' +
    `来源: ${D.meta.source} / 游戏版本 ${D.meta.version}\r\n` +
    `导出条目: ${manifest.length}\r\n` +
    `导出时间: ${new Date().toLocaleString()}\r\n\r\n` +
    '目录结构:\r\n' +
    '  png/<分类>/<id>.png   已合成好的独立贴图（含强化/蜡封/版本特效）\r\n' +
    '  manifest.json         全部条目的名称、描述、数值与图集坐标\r\n' +
    '  data.csv              可导入表格软件的扁平数据\r\n\r\n' +
    '说明: 每张 PNG 均为 2x 原始像素（142x190），透明背景。\r\n' +
    '图集坐标格式为 {atlas, pos:{x,y}}，对应游戏 Atlas 中的列/行。\r\n') });
  save(zipStore(files), `balatro-assets-${safeName(S.cat)}-${Date.now()}.zip`, 'application/zip');
  toast(`已导出 ${manifest.length} 项 → ZIP`);
}

/* ---------------------------------------------------------------- forge */
/** The eight coloured stake stickers (they all share one sprite sheet position family). */
const STICKER_COLORS = ['White', 'Red', 'Green', 'Black', 'Blue', 'Purple', 'Orange', 'Gold'].map((k) => ({ key: k }));
/* The forge is rebuilt from ITEMS on every render, because importing a mod can add whole
   categories (Cryptid alone brings 224 jokers, 34 code cards, 17 sleeves, …). */
let FORGE_CARDS = [];
let FORGE_ENH = [];
let FORGE_EDITIONS = [];
let FORGE_SEALS = [];
let FORGE_BACKS = [];
let FORGE_TYPES = [];

/**
 * Which extra layers the game can legally attach to each kind of centre.
 * Seals only exist on playing cards; eternal/perishable/rental stickers only on jokers.
 * A category a mod invented allows the edition layer only — we cannot know its rules.
 */
const FORGE_TYPES_BASE = [
  { id: 'PlayingCard', name: '扑克牌', allows: { enhancement: true, seal: true, sticker: false, edition: true, back: true } },
  { id: 'Joker', name: '小丑牌', allows: { enhancement: false, seal: false, sticker: true, edition: true, back: false } },
  { id: 'Collab', name: '联动牌面', allows: { enhancement: true, seal: true, sticker: false, edition: true, back: false } },
  { id: 'Tarot', name: '塔罗牌', allows: { enhancement: false, seal: false, sticker: false, edition: true, back: false } },
  { id: 'Planet', name: '星球牌', allows: { enhancement: false, seal: false, sticker: false, edition: true, back: false } },
  { id: 'Spectral', name: '幽灵牌', allows: { enhancement: false, seal: false, sticker: false, edition: true, back: false } },
  { id: 'Voucher', name: '优惠券', allows: { enhancement: false, seal: false, sticker: false, edition: true, back: false } },
  { id: 'Booster', name: '补充包', allows: { enhancement: false, seal: false, sticker: false, edition: true, back: false } },
];
const MOD_ALLOWS = { enhancement: false, seal: false, sticker: false, edition: true, back: false };

function refreshForgeLists () {
  FORGE_CARDS = ITEMS.filter((i) => i.cat === 'PlayingCard');
  FORGE_ENH = ITEMS.filter((i) => i.cat === 'Enhancement');
  FORGE_EDITIONS = ITEMS.filter((i) => i.cat === 'Edition');
  FORGE_SEALS = ITEMS.filter((i) => i.cat === 'Seal');
  FORGE_BACKS = ITEMS.filter((i) => i.cat === 'Deck');
  const count = (id) => ITEMS.filter((i) => i.cat === id).length;
  FORGE_TYPES = FORGE_TYPES_BASE
    .filter((t) => count(t.id) > 0)
    .map((t) => ({ id: t.id, name: t.name, label: t.name + ' (' + count(t.id) + ')', allows: t.allows }));
  const known = new Set(FORGE_TYPES_BASE.map((t) => t.id));
  const extra = [...new Set(ITEMS.map((i) => i.cat))].filter((c) => !known.has(c) && count(c) > 0);
  const vanillaCats = new Set(['all', 'Base', 'Other', 'Atlas', 'Shader', 'Hand', 'Overlay', 'Challenge', 'Stake', 'Tag', 'Blind', 'DeckSkin', 'PokerHand']);
  for (const c of extra) {
    if (vanillaCats.has(c)) continue;
    FORGE_TYPES.push({ id: c, name: categoryLabel(c), label: categoryLabel(c) + ' (' + count(c) + ')', allows: MOD_ALLOWS, mod: true });
  }
  // the currently selected subject may have come from a mod that was just unloaded
  if (!FORGE_TYPES.some((t) => t.id === S.forge.baseType)) S.forge.baseType = FORGE_TYPES[0].id;
  const cur = BY_ID[S.forge.base];
  if (!cur || cur.cat !== S.forge.baseType) {
    const first = ITEMS.find((i) => i.cat === S.forge.baseType);
    S.forge.base = first ? first.id : S.forge.base;
  }
}
const forgeType = (id) => FORGE_TYPES.find((t) => t.id === id) || FORGE_TYPES[0];
const forgeBaseList = (typeId, q) => {
  let list = ITEMS.filter((i) => i.cat === typeId);
  if (q) {
    const s = q.toLowerCase();
    list = list.filter((i) => buildBlob(i).includes(s));
  }
  return list;
};
function forgeBaseItem () {
  const b = BY_ID[S.forge.base];
  if (b && b.cat === S.forge.baseType) return b;
  return ITEMS.find((i) => i.cat === S.forge.baseType) || BY_ID['S_A'];
}

function forgeSpec () {
  const F = S.forge;
  const type = forgeType(F.baseType);
  const a = type.allows;
  const base = forgeBaseItem();
  const back = BY_ID[F.back];
  const spec = {
    highContrast: F.variants,
    edition: a.edition ? editionShaderOf(BY_ID[F.edition]) : null,
    seal: a.seal ? F.seal : null,
  };
  if (a.sticker) {
    // card.lua: set_eternal requires eternal_compat and NOT perishable;
    // set_perishable requires perishable_compat and NOT eternal; rental is unrestricted.
    const list = [];
    if (F.stickers.eternal && base.eternal_compat) list.push('eternal');
    if (F.stickers.perishable && base.perishable_compat) list.push('perishable');
    if (F.stickers.rental) list.push('rental');
    if (F.stickers.color) list.push(F.stickers.color);
    spec.stickers = list;
  }
  if (type.id === 'PlayingCard' || type.id === 'Collab') {
    const enh = a.enhancement && F.enhancement ? BY_ID[F.enhancement] : null;
    const face = type.id === 'Collab'
      ? { atlas: base.atlas, atlas2: base.atlas2, pos: base.pos }
      : { atlas: F.variants ? 'cards_2' : 'cards_1', pos: base.pos };
    spec.center = enh && enh.id !== 'none'
      ? { atlas: 'centers', pos: enh.pos, stoneNoFront: enh.id === 'm_stone' }
      : { atlas: 'centers', pos: COM.baseCenter.pos };
    spec.front = F.showFront ? face : null;
    spec.back = F.showFront ? null : { atlas: 'centers', pos: back ? back.pos : { x: 0, y: 0 } };
  } else {
    spec.center = (base.atlas && base.pos) ? { atlas: base.atlas, pos: base.pos } : null;
    if (base.setShader) spec.setShader = base.setShader;
    if (base.soul) spec.soul = base.soul;
    if (base.box) spec.box = base.box;
    if (base.id === 'j_hologram') spec.soulHologram = true;
  }
  return spec;
}
/* 动画信息（帧数 / 接缝比）算一次要跑一整段动画、再逐帧读像素 —— 合成台里最贵的一步，
 *  CDP profile 实测每次渲染 170~250ms（getImageData 占绝大头）。
 *  所以：① 按「规格 + 动画设置」缓存，同样的选择重渲染直接命中；
 *  ② 没命中就先放一句「计算中…」，等浏览器空闲了再算，不把这一帧卡住。
 *  apply(undefined) = 占位中 / apply(null) = 算不出来 / apply(obj) = 结果 */
const ANIM_INFO_CACHE = new Map();
function animInfoAsync (spec, apply) {
  let sig = '';
  try { sig = JSON.stringify(spec) + '|' + S.anim.fps + '|' + S.anim.seconds + '|' + (S.anim.loop || 'auto') + '|' + S.anim.speed } catch (e) { sig = '' }
  if (ANIM_INFO_CACHE.has(sig)) { apply(ANIM_INFO_CACHE.get(sig)); return }
  apply(undefined);
  const run = () => {
    let out = null;
    try {
      const f = buildAnimFrames(spec, 1, animOpts(spec));
      const o = animOpts(spec);
      out = { frames: f.frames.length, delay: f.delay, seam: loopSeamRatio(f.frames), autoPeriod: o.autoPeriod || null, loopMode: (S.anim.loop || 'auto') };
    } catch (e) { out = null }
    if (ANIM_INFO_CACHE.size > 40) ANIM_INFO_CACHE.clear();
    ANIM_INFO_CACHE.set(sig, out);
    try { apply(out) } catch (e) { /* 元素可能已经不在页面上了 */ }
  };
  if (window.requestIdleCallback) requestIdleCallback(run, { timeout: 500 }); else setTimeout(run, 16);
}

function viewForge (root) {
  refreshForgeLists();
  const wrap = document.createElement('div'); wrap.className = 'forge';
  const left = document.createElement('div'); left.className = 'preview';
  const right = document.createElement('div'); right.className = 'opts';
  const nav = document.createElement('div'); nav.className = 'forgenav';
  wrap.appendChild(left); wrap.appendChild(right); right.appendChild(nav); root.appendChild(wrap);

  /* ---- collapsing: a long column is fine as long as you can put things away ---- */
  const NAV_GROUPS = [
    ['basetype', '牌型'], ['base', '主体'], ['enh', '强化'], ['ed', '版本'], ['seal', '蜡封'],
    ['stick', '贴纸'], ['back', '牌背'], ['view', '显示'],
  ];
  const openState = () => {
    if (!S.forge.open) {
      // first visit: keep only what most people reach for, so the column is not endless
      const all = { basetype: true, base: true, enh: true, ed: true, seal: true, stick: false, back: false, view: false, summary: !isNarrow(), export: true, anim: false };
      S.forge.open = isNarrow()
        ? Object.assign({}, all, { enh: false, ed: false, seal: false, summary: false, export: false, anim: false })
        : all;
    }
    return S.forge.open;
  };
  const isOpen = (key) => !!openState()[key];
  const applyOpen = (box, key) => { box.classList.toggle('collapsed', !isOpen(key)) };
  const syncNav = () => {
    for (const b of nav.querySelectorAll('.nv[data-gkey]')) b.classList.toggle('on', isOpen(b.dataset.gkey));
    for (const g of groups) if (g.label && g.cur) g.cur.textContent = g.label();
  };
  const toggleOpen = (key, force) => {
    const o = openState();
    o[key] = force === undefined ? !o[key] : !!force;
    for (const el of document.querySelectorAll('#content .opt[data-gkey="' + key + '"]')) applyOpen(el, key);
    syncNav();
  };
  /** A collapsible box: header shows the current pick, body holds the chips. */
  const section = (key, title) => {
    const box = document.createElement('section');
    box.className = 'opt'; box.dataset.gkey = key;
    const head = document.createElement('h4');
    const ttl = document.createElement('span'); ttl.className = 'otitle'; ttl.textContent = title;
    const cur = document.createElement('span'); cur.className = 'ocur';
    const chev = document.createElement('span'); chev.className = 'chev'; chev.textContent = '▾';
    head.appendChild(ttl); head.appendChild(cur); head.appendChild(chev);
    head.onclick = () => toggleOpen(key);
    box.appendChild(head);
    const body = document.createElement('div'); body.className = 'obody';
    box.appendChild(body);
    applyOpen(box, key);
    return { box, body, cur, key, head };
  };

  let previewCanvas = null;
  let nowLine = null;   // the always-visible one-line summary under the preview
  let sumSec = null;    // its collapsible "full detail" section
  /** Human-readable summary of everything currently stacked in the forge. */
  const forgeSummary = () => {
    const F = S.forge;
    const type = forgeType(F.baseType);
    const a = type.allows;
    const base = forgeBaseItem();
    const spec = forgeSpec();
    const label = (it) => (it ? `${nm(it)}（${it.id}）` : null);
    const rows = [];
    rows.push(['牌型', type.label]);
    rows.push(['主体', `${nm(base)}（${base.id}）`]);
    if (base.source) rows.push(['来源', `${base.sourceName || base.source}（${base.source}）`]);
    if (!base.atlas || !base.pos) rows.push(['提示', '这个条目本身没有卡图，预览只会显示叠加层']);
    if (base.atlas) {
      const at = D.atlases[base.atlas];
      rows.push(['主体贴图', `${base.atlas} (${base.pos ? base.pos.x + ',' + base.pos.y : '-'})${at ? ' · ' + at.file.split('/').pop() : ''}`]);
    }
    if (a.enhancement) rows.push(['强化', F.enhancement && BY_ID[F.enhancement] ? label(BY_ID[F.enhancement]) : (F.enhancement ? F.enhancement : '无')]);
    rows.push(['版本', !a.edition ? '不适用' : (F.edition && BY_ID[F.edition] ? label(BY_ID[F.edition]) + (BY_ID[F.edition].shader ? '（自定义着色器 ' + BY_ID[F.edition].shader + '，未移植）' : '') : (F.edition || '无'))]);
    if (a.seal) rows.push(['蜡封', F.seal ? (BY_ID['seal_' + F.seal] ? label(BY_ID['seal_' + F.seal]) : F.seal) : '无']);
    if (a.sticker) {
      const st = F.stickers;
      const parts = [];
      if (st.eternal && base.eternal_compat) parts.push('永恒');
      if (st.perishable && base.perishable_compat) parts.push('易腐');
      if (st.rental) parts.push('租用');
      if (st.color) parts.push(st.color + ' 彩色');
      rows.push(['贴纸', parts.length ? parts.join(' + ') : '无']);
    }
    if (a.back) rows.push(['牌背', F.showFront ? '（当前显示正面）' : label(BY_ID[F.back]) || '无']);
    if (type.id === 'PlayingCard' || type.id === 'Collab') rows.push(['牌面', F.variants ? '高对比 (cards_2)' : '标准 (cards_1)']);
    if (spec.soul) rows.push(['悬浮立绘', `${spec.soul.atlas} (${spec.soul.pos.x},${spec.soul.pos.y})${spec.soulHologram ? ' · hologram' : ''}`]);
    if (spec.setShader) rows.push(['卡体流光', spec.setShader]);
    rows.push(['导出尺寸', `${Math.round(CARD_W * S.scale)}×${Math.round(CARD_H * S.scale)}（${S.scale}x）`]);
    rows.push(['相位', S.anim.on ? `动画中 t=${S.anim.t.toFixed(2)}` : `${S.phase}${S.phase === 0 ? '（立绘摆正）' : ''}`]);
    return rows;
  };
  const paintSummary = () => {
    const box = left.querySelector('.pvsummary');
    if (!box) return;
    box.innerHTML = '';
    const tb = document.createElement('table');
    tb.className = 'kv';
    for (const [k, v] of forgeSummary()) {
      const tr = document.createElement('tr');
      const td1 = document.createElement('td'); td1.textContent = k;
      const td2 = document.createElement('td'); td2.textContent = String(v);
      tr.appendChild(td1); tr.appendChild(td2);
      tb.appendChild(tr);
    }
    box.appendChild(tb);
  };
  const paintPreview = () => {
    const base = compose(forgeSpec(), S.scale, phaseNow());
    previewCanvas = base;
    const dir = (S.forge.showFront || !forgeType(S.forge.baseType).allows.back) ? '正面' : '牌背';
    const head = left.querySelector('.pvhead');
    if (head) head.textContent = `${base.width}×${base.height} · ${dir} · ${forgeBaseItem().name}`;
    const holder = left.querySelector('.pvbox');
    if (holder) {
      holder.innerHTML = '';
      const shown = newCanvas(base.width, base.height);
      shown.getContext('2d').drawImage(base, 0, 0);
      const maxW = isNarrow() ? 88 : 320;
      shown.style.cssText = `width:${Math.min(maxW, previewWidth(base, 200))}px;height:auto;image-rendering:pixelated;display:block;pointer-events:none;-webkit-user-drag:none`;
      holder.appendChild(shown);
    }
    paintSummary();
    const one = [];
    const F2 = S.forge;
    const t2 = forgeType(F2.baseType);
    one.push('主体 ' + nm(forgeBaseItem()));
    if (t2.allows.enhancement && F2.enhancement && BY_ID[F2.enhancement]) one.push('强化 ' + nm(BY_ID[F2.enhancement]));
    if (t2.allows.edition && F2.edition && BY_ID[F2.edition]) one.push('版本 ' + nm(BY_ID[F2.edition]));
    if (t2.allows.seal && F2.seal) one.push('蜡封 ' + F2.seal);
    if (t2.allows.sticker) {
      const st = [F2.stickers.eternal && '永恒', F2.stickers.perishable && '易腐', F2.stickers.rental && '租用', F2.stickers.color].filter(Boolean);
      if (st.length) one.push('贴纸 ' + st.join('+'));
    }
    if (t2.allows.back && !F2.showFront) one.push('牌背');
    nowLine.textContent = one.join(' · ');
    if (sumSec && sumSec.cur) sumSec.cur.textContent = one.length > 2 ? one.length + ' 层叠加' : one.slice(1).join(' · ') || '未叠加';
  };
  const draw = paintPreview;
  function build () {
    left.innerHTML = '';
    /* The pinned part on phones: preview + one-line combination, side by side and short.
       Everything else (details / export / animation) goes BELOW the option groups so it can
       never cover them. */
    const pvtop = document.createElement('div'); pvtop.className = 'pvtop';
    left.appendChild(pvtop);
    pvtop.onclick = () => pvtop.classList.toggle('zoom');
    const t = document.createElement('div'); t.className = 'pvhead';
    t.dataset.role = 'pvhead';
    t.style.cssText = 'font-size:12px;color:var(--fg3);margin-bottom:10px';
    pvtop.appendChild(t);
    const holder = document.createElement('div'); holder.className = 'pvbox';
    holder.style.cssText = 'display:inline-block;padding:18px;border-radius:10px;background:repeating-conic-gradient(#1a242e 0% 25%,#141d26 0% 50%) 50%/16px 16px';
    pvtop.appendChild(holder);
    nowLine = document.createElement('div'); nowLine.className = 'pvnow';
    pvtop.appendChild(nowLine);
    sumSec = section('summary', '当前组合详情');
    const summaryBox = document.createElement('div'); summaryBox.className = 'pvsummary';
    sumSec.body.appendChild(summaryBox);
    left.appendChild(sumSec.box);
    const exSec = section('export', '导出图片 / 数据');
    exSec.cur.textContent = 'PNG · SVG · JSON';
    const btns = document.createElement('div'); btns.className = 'btns'; btns.style.cssText = 'justify-content:center;margin-top:2px';
    const mk = (label, fn, cls) => { const b = document.createElement('button'); b.className = 'btn' + (cls || ''); b.textContent = label; b.onclick = fn; btns.appendChild(b); return b; };
    mk('⤓ PNG 1x', () => saveCanvas(1));
    mk('⤓ PNG 2x', () => saveCanvas(2));
    mk('⤓ PNG 4x', () => saveCanvas(4));
    mk('⤓ SVG', () => saveSVG());
    mk('⧉ 复制组合 JSON', () => copyCombo());
    exSec.body.appendChild(btns);
    left.appendChild(exSec.box);

    const anSec = section('anim', '动图与动画');
    const btns2 = document.createElement('div'); btns2.className = 'btns'; btns2.style.cssText = 'justify-content:center;margin-top:2px';
    const mk2 = (label, fn, cls) => { const b = document.createElement('button'); b.className = 'btn' + (cls || ''); b.textContent = label; b.onclick = fn; btns2.appendChild(b); return b; };
    mk2('🎞 GIF 动图', () => exportAnim('gif'), ' primary');
    mk2('🎞 APNG 动图', () => exportAnim('apng'));
    mk2('🎞 帧序列 ZIP', () => exportAnim('frames'));
    anSec.body.appendChild(btns2);
    left.appendChild(anSec.box);

    const row = document.createElement('div'); row.className = 'btns'; row.style.cssText = 'justify-content:center;margin-top:2px;align-items:center';
    const bgSel = document.createElement('select'); bgSel.className = 'tbtn';
    for (const [v, label] of [['transparent', 'GIF 背景：透明'], ['dark', 'GIF 背景：深色'], ['white', 'GIF 背景：白色']]) {
      const o = document.createElement('option'); o.value = v; o.textContent = label; if ((S.gifBg === null && v === 'transparent') || (v === 'dark' && S.gifBg && S.gifBg[0] === 18) || (v === 'white' && S.gifBg && S.gifBg[0] === 255)) o.selected = true; bgSel.appendChild(o);
    }
    bgSel.onchange = () => {
      S.gifBg = bgSel.value === 'transparent' ? null : bgSel.value === 'dark' ? [18, 24, 30] : [255, 255, 255];
    };
    row.appendChild(bgSel);
    anSec.body.appendChild(row);

    const row2 = document.createElement('div'); row2.className = 'btns'; row2.style.cssText = 'justify-content:center;margin-top:8px';
    const animBtn = document.createElement('button'); animBtn.className = 'btn'; animBtn.textContent = '▶ 实时动画预览';
    animBtn.onclick = () => {
      if (S.anim.on) { stopAnim(); animBtn.textContent = '▶ 实时动画预览'; animBtn.classList.remove('primary'); paintPreview(); return; }
      animBtn.textContent = '⏸ 停止动画'; animBtn.classList.add('primary');
      startAnim(() => paintPreview());
    };
    row2.appendChild(animBtn);
    const speedSel = document.createElement('select'); speedSel.className = 'tbtn';
    for (const [v, label] of [[0.5, '速度 0.5×'], [1, '速度 1×（原速）'], [2, '速度 2×'], [3, '速度 3×'], [4, '速度 4×'], [6, '速度 6×'], [8, '速度 8×'], [12, '速度 12×'], [16, '速度 16×']]) {
      const o = document.createElement('option'); o.value = v; o.textContent = label; if (S.anim.speed === v) o.selected = true; speedSel.appendChild(o);
    }
    speedSel.onchange = () => { S.anim.speed = +speedSel.value; refreshAnimInfo() };
    row2.appendChild(speedSel);
    const fpsSel = document.createElement('select'); fpsSel.className = 'tbtn';
    for (const [v, label] of [[10, '帧率 10fps'], [15, '帧率 15fps'], [20, '帧率 20fps（默认）'], [25, '帧率 25fps'], [30, '帧率 30fps'], [50, '帧率 50fps']]) {
      const o = document.createElement('option'); o.value = v; o.textContent = label; if (S.anim.fps === v) o.selected = true; fpsSel.appendChild(o);
    }
    fpsSel.onchange = () => { S.anim.fps = +fpsSel.value; refreshAnimInfo() };
    row2.appendChild(fpsSel);
    const durSel = document.createElement('select'); durSel.className = 'tbtn';
    for (const [v, label] of [[1, '时长 1s'], [1.5, '时长 1.5s'], [2.5, '时长 2.5s'], [4, '时长 4s'], [6, '时长 6s'], [10, '时长 10s']]) {
      const o = document.createElement('option'); o.value = v; o.textContent = label; if (S.anim.seconds === v) o.selected = true; durSel.appendChild(o);
    }
    durSel.onchange = () => { S.anim.seconds = +durSel.value; refreshAnimInfo() };
    row2.appendChild(durSel);
    const loopBtn = document.createElement('button');
    loopBtn.className = 'btn primary';
    loopBtn.textContent = loopLabel();
    loopBtn.title = '自动 = 用着色器源码里的频率去找真正的循环点；来回 = 正放再倒放（永远不会跳变）；单向 = 直接重复';
    loopBtn.onclick = () => { loopBtn.textContent = cycleLoop(); refreshAnimInfo() };
    row2.appendChild(loopBtn);
    anSec.body.appendChild(row2);
    const seam = document.createElement('div'); seam.className = 'hint mono'; seam.style.minHeight = '16px';
    anSec.body.appendChild(seam);
    function refreshAnimInfo () {
      animInfoAsync(forgeSpec(), (info) => {
        if (info === undefined) { seam.textContent = '计算动图信息…'; return }
        if (!info) { seam.textContent = ''; return }
        const secs = (info.frames * info.delay / 1000).toFixed(1);
        const loopNote = info.autoPeriod
          ? ` · 检测到循环点 ${info.autoPeriod.toFixed(2)}s`
          : (info.loopMode === 'auto' ? ' · 未找到短循环，已按来回循环' : '');
        seam.textContent = info.seam
          ? `${info.frames} 帧 · ${info.delay}ms（≈${Math.round(1000 / info.delay)}fps）· 全长 ${secs}s · 接缝比 ${info.seam.ratio.toFixed(2)}（1 = 最顺）${loopNote}`
          : '';
      });
    }
    refreshAnimInfo();

    const hint = document.createElement('div'); hint.className = 'hint';
    hint.innerHTML = '导出为透明背景 PNG，可直接用于做图 / 视频封面。<br>' +
      '版本特效（闪箔 / 镭射 / 多彩 / 负片）、优惠券 / 补充包 / 幽灵牌的流光、传奇牌与灵魂牌的浮动立绘（含原版投影），全部由原版 GLSL 与动画参数实时渲染。' +
      '<br><b>速度</b>：游戏里这些特效是 1× 实时速度，一个完整周期长达二三十秒，所以导出动图默认加速 4×；想完全还原请选 1×。<br>' +
      '<b>循环</b>：特效是若干正弦项相加，每一项都有自己的周期，所以只要找到它们的公共循环点，单向重复也看不出跳变；' +
      '找不到短循环时才退回「来回循环」（正放再倒放，接缝天然无跳变）。循环点是从着色器源码里的频率算出来、' +
      '再逐帧渲染验证的，合成台的读数里会写明检测结果。<br>' +
      '<br><b>相位 0</b> = 悬浮立绘摆正的姿势（所有正弦项归零），静态导出建议保持 0。' +
      '<br><b>GIF</b>：任何看图软件都能动（256 色）；<b>APNG</b>：全彩带透明，但只有浏览器等支持 APNG 的查看器会动。' +
      (GL ? '' : '<br><b style="color:var(--red)">当前浏览器未启用 WebGL，着色器特效无法渲染，其余功能不受影响。</b>');
    hint.style.cssText = 'text-align:left;margin:8px 0 2px;font-size:11px;line-height:1.6';
    anSec.body.appendChild(hint);
  }
  function saveCanvas (scale) {
    ensureDrawn().then(async () => { save(await canvasBytes(compose(forgeSpec(), scale, phaseNow())), `balatro-${S.forge.baseType}-${forgeBaseItem().id}-${scale}x.png`, 'image/png'); toast('已导出 PNG'); });
  }
  function saveSVG () {
    const cv = compose(forgeSpec(), 2, phaseNow());
    const url = cv.toDataURL('image/png');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cv.width}" height="${cv.height}" viewBox="0 0 ${cv.width} ${cv.height}"><image width="${cv.width}" height="${cv.height}" image-rendering="pixelated" xlink:href="${url}" xmlns:xlink="http://www.w3.org/1999/xlink"/></svg>`;
    save(new Blob([svg], { type: 'image/svg+xml' }), `balatro-${forgeBaseItem().id}.svg`, 'image/svg+xml'); toast('已导出 SVG');
  }
  function exportAnim (kind) {
    toast(kind === 'gif' ? '正在渲染并量化 GIF…' : '正在渲染动画帧…');
    const base = forgeBaseItem().id;
    setTimeout(() => {
      try {
        const r = buildAnimFrames(forgeSpec(), 2, animOpts(forgeSpec()));
        if (kind === 'apng') saveAnimAPNG(r.frames, r.delay, `balatro-${base}-动图.png`);
        else if (kind === 'gif') saveAnimGIF(r.frames, r.delay, `balatro-${base}-动图.gif`, S.gifBg);
        else saveFrameZip(r.frames, r.delay, `balatro-${base}-帧序列.zip`);
      } catch (e) { toast('动图生成失败：' + e.message) }
    }, 30);
  }
  function copyCombo () {
    const F = S.forge;
    const txt = JSON.stringify({
      baseType: F.baseType, base: forgeBaseItem().id, enhancement: F.enhancement, edition: F.edition,
      seal: F.seal, stickers: F.stickers, back: F.back, highContrast: F.variants,
    }, null, 2);
    navigator.clipboard?.writeText(txt).then(() => toast('已复制组合 JSON'), () => toast('复制失败'));
  }

  /* ---- 缩略图缓存 ----------------
   * 「选择主体」最多有 150+ 项，以前每次重排（切牌型 / 搜索框每敲一个字）都要把每一项
   * 重新 compose 一遍（每张 1-3ms，一敲就是几百毫秒）。这里按条目 id 缓存那张 26×35 的小图，
   * 重排时只做一次 drawImage 复制。相位固定 0，保证缓存可复用。 */
  const MINI_CACHE = new Map();
  const miniThumb = (it) => {
    let src = MINI_CACHE.get(it.id);
    if (!src) {
      const spec = specForItem(it);
      if (!spec) return null;
      const mini = compose(spec, 2, 0);
      src = newCanvas(26, 35);
      const c2 = src.getContext('2d');
      c2.imageSmoothingEnabled = false;
      const r = Math.min(src.width / mini.width, src.height / mini.height);
      c2.drawImage(mini, (src.width - mini.width * r) / 2, (src.height - mini.height * r) / 2, mini.width * r, mini.height * r);
      if (MINI_CACHE.size > 1500) MINI_CACHE.clear();
      MINI_CACHE.set(it.id, src);
    }
    const out = newCanvas(26, 35);
    out.getContext('2d').drawImage(src, 0, 0);
    return out;
  };

  /* ---- option groups ---- */
  const groups = [];
  const group = (title, items, getValue, onPick, opts) => {
    const sec = section((opts && opts.gkey) || title, title);
    const box = sec.box;
    const chips = document.createElement('div'); chips.className = 'chips';
    const buttons = [];
    const valueOf = (opts && typeof opts.value === 'function') ? opts.value : ((it) => it.id);
    const fill = (list) => {
      chips.innerHTML = ''; buttons.length = 0;
      if (opts && opts.allowNone) {
        const b = document.createElement('button');
        b.className = 'pick nosprite'; b.textContent = '无（不叠加）';
        b.onclick = () => { onPick(''); draw(); updateChips(); };
        chips.appendChild(b); buttons.push({ b, v: '' });
      }
      for (const it of list) {
        const b = document.createElement('button');
        b.className = 'pick'; b.title = nm(it) + ' · ' + it.id;
        /* 滚到视野里才画（rootMargin 300px 提前量）：150 项一次性 compose 要 370ms，
           现在只有真正看得到的那几十项会画，剩下的滚动时补上，缓存命中后就是一次 drawImage。 */
        const art = document.createElement('span');
        art.className = 'pickart';
        b.appendChild(art);
        b.__paintThumb = () => { if (b.__painted) return; b.__painted = true;
          const sm = miniThumb(it); if (sm) { art.innerHTML = ''; art.appendChild(sm) } };
        if (IO) { b._paint = b.__paintThumb; IO.observe(b) } else b.__paintThumb();
        const s = document.createElement('span'); s.textContent = nm(it); b.appendChild(s);
        if (it.source) {
          const md = document.createElement('i'); md.className = 'pickmod'; md.textContent = 'MOD';
          md.title = it.sourceName || it.source;
          b.appendChild(md);
        }
        const v = valueOf(it);
        b.onclick = () => { onPick(v); draw(); updateChips(); };
        chips.appendChild(b); buttons.push({ b, v });
      }
    };
    fill(items);
    sec.body.appendChild(chips);
    const note = document.createElement('div'); note.className = 'hint'; note.style.display = 'none';
    sec.body.appendChild(note);
    const g = { box, body: sec.body, buttons, getValue, fill, note, cur: sec.cur, label: (opts && opts.cur) || null, key: opts && opts.key, gkey: sec.key };
    groups.push(g);
    return g;
  };
  function updateChips () {
    const a = forgeType(S.forge.baseType).allows;
    for (const g of groups) {
      const cur = g.getValue ? g.getValue() : null;
      for (const { b, v } of g.buttons) b.classList.toggle('on', cur === v);
      if (g.key) {
        const ok = !!a[g.key];
        g.box.style.opacity = ok ? '1' : '.45';
        g.note.style.display = ok ? 'none' : 'block';
        if (!ok) g.note.textContent = ({ enhancement: '强化只能用在扑克牌上', seal: '蜡封只能贴在扑克牌上', sticker: '贴纸只能贴在小丑牌上', back: '牌背只有扑克牌才有', edition: '' })[g.key] || '该层不适用于此牌型';
        for (const { b } of g.buttons) b.disabled = !ok;
      }
    }
    // the sticker block is built separately (multi-select), so refresh its gating too
    updateStickers();
    if (typeof syncNav === 'function') syncNav();
  }

  const typeSec = section('basetype', '牌型');
  typeSec.cur.textContent = forgeType(S.forge.baseType).name;
  const typeSel = document.createElement('select'); typeSel.className = 'tbtn'; typeSel.style.width = '100%';
  for (const t of FORGE_TYPES) { const o = document.createElement('option'); o.value = t.id; o.textContent = t.label; typeSel.appendChild(o); }
  typeSel.value = S.forge.baseType;
  typeSec.body.appendChild(typeSel);
  const baseSearch = document.createElement('input');
  baseSearch.className = 'tbtn'; baseSearch.placeholder = '筛选…（名称 / id / source:Cryptid）';
  baseSearch.style.cssText = 'width:100%;margin-top:8px;padding:5px 8px';
  typeSec.body.appendChild(baseSearch);
  const baseHint = document.createElement('div'); baseHint.className = 'hint';
  typeSec.body.appendChild(baseHint);
  right.appendChild(typeSec.box);

  const gBase = group('选择主体', [], () => S.forge.base, (v) => { S.forge.base = v; }, {
    key: null, gkey: 'base',
    cur: () => nm(forgeBaseItem()) + (forgeBaseItem().source ? ' · MOD' : ''),
  });
  right.appendChild(gBase.box);
  const refreshBase = () => {
    let list = forgeBaseList(S.forge.baseType, S.forge.baseQuery);
    const total = ITEMS.filter((i) => i.cat === S.forge.baseType).length;
    const mods = list.filter((i) => i.source).length;
    baseHint.textContent = `${total} 项${mods ? `（其中 ${mods} 项来自 Mod）` : ''}${list.length !== total ? ` · 筛出 ${list.length}` : ''}`;
    gBase.fill(list);
    updateChips();
  };
  typeSel.onchange = () => {
    S.forge.baseType = typeSel.value;
    S.forge.baseQuery = ''; baseSearch.value = '';
    const first = ITEMS.find((i) => i.cat === S.forge.baseType);
    S.forge.base = first ? first.id : S.forge.base;
    typeSec.cur.textContent = forgeType(S.forge.baseType).name;
    build(); refreshBase(); draw(); updateChips();
  };
  baseSearch.oninput = () => { S.forge.baseQuery = baseSearch.value; refreshBase(); };

  const gEnh = group('强化 Enhancement（改变卡体外观）', FORGE_ENH, () => S.forge.enhancement, (v) => { S.forge.enhancement = v; }, {
    allowNone: true, key: 'enhancement', gkey: 'enh',
    cur: () => {
      if (!forgeType(S.forge.baseType).allows.enhancement) return '不适用';
      const v = S.forge.enhancement; const it = v && BY_ID[v];
      return (!v || v === 'none') ? '无' : (it ? nm(it) : v);
    },
  });
  const gEd = group('版本 Edition（原版 GLSL 特效）', FORGE_EDITIONS, () => S.forge.edition, (v) => { S.forge.edition = v; }, {
    allowNone: true, key: 'edition', gkey: 'ed',
    cur: () => {
      if (!forgeType(S.forge.baseType).allows.edition) return '不适用';
      const v = S.forge.edition; const it = v && BY_ID[v];
      return v ? (it ? nm(it) : v) : '无';
    },
  });
  const gSeal = group('蜡封 Seal（仅扑克牌）', FORGE_SEALS, () => S.forge.seal, (v) => { S.forge.seal = v; }, {
    allowNone: true, key: 'seal', gkey: 'seal', value: (it) => it.key,
    cur: () => {
      if (!forgeType(S.forge.baseType).allows.seal) return '不适用';
      if (!S.forge.seal) return '无';
      const it = BY_ID['seal_' + S.forge.seal];
      return it ? nm(it) : S.forge.seal;
    },
  });
  right.appendChild(gEnh.box); right.appendChild(gEd.box); right.appendChild(gSeal.box);

  /* ---- stickers: several can share one joker (see card.lua: set_eternal / set_perishable) ---- */
  const stickSec = section('stick', '贴纸 Sticker（仅小丑牌 · 可同时存在）');
  const gStick = stickSec.box;
  const stickChips = document.createElement('div'); stickChips.className = 'chips';
  const stickNote = document.createElement('div'); stickNote.className = 'hint';
  const stickButtons = [];
  const stickerStat = () => {
    const base = forgeBaseItem();
    return { eternal: !!base.eternal_compat, perishable: !!base.perishable_compat };
  };
  const mkStick = (key, label, kind) => {
    const b = document.createElement('button');
    b.className = 'pick';
    b.dataset.kind = kind;
    b.dataset.key = key;
    const spec = specForItem(BY_ID['sticker_' + key] || BY_ID['sticker_eternal']);
    if (spec) {
      const mini = compose(Object.assign({}, spec, { center: { atlas: 'Joker', pos: { x: 0, y: 0 } } }), 2, phaseNow());
      const sm = newCanvas(26, 35);
      const c2 = sm.getContext('2d'); c2.imageSmoothingEnabled = false;
      const r = Math.min(sm.width / mini.width, sm.height / mini.height);
      c2.drawImage(mini, (sm.width - mini.width * r) / 2, (sm.height - mini.height * r) / 2, mini.width * r, mini.height * r);
      b.appendChild(sm);
    }
    const s = document.createElement('span'); s.textContent = label; b.appendChild(s);
    b.onclick = () => {
      if (b.disabled) return;
      const on = !S.forge.stickers[key];
      S.forge.stickers[key] = on;
      // eternal and perishable are drawn at the SAME spot on the card, so the game
      // never lets them coexist — behave like a radio pair.
      if (on && key === 'eternal') S.forge.stickers.perishable = false;
      if (on && key === 'perishable') S.forge.stickers.eternal = false;
      draw(); updateStickers();
    };
    stickChips.appendChild(b); stickButtons.push(b);
    return b;
  };
  // eternal / perishable are mutually exclusive in the game, so enlist them in one group
  mkStick('eternal', '永恒 Eternal', 'flag');
  mkStick('perishable', '易腐 Perishable', 'flag');
  mkStick('rental', '租用 Rental', 'flag');
  gStick.appendChild(stickChips);
  const colorRow = document.createElement('div'); colorRow.className = 'chips'; colorRow.style.marginTop = '6px';
  const colorButtons = [];
  const mkColor = (key, label) => {
    const b = document.createElement('button');
    b.className = 'pick'; b.dataset.kind = 'color'; b.dataset.key = key;
    const src = BY_ID['sticker_' + (key || 'White')];
    const spec = specForItem(src);
    if (spec) {
      const mini = compose(Object.assign({}, spec, { center: { atlas: 'Joker', pos: { x: 0, y: 0 } } }), 2, phaseNow());
      const sm = newCanvas(26, 35);
      const c2 = sm.getContext('2d'); c2.imageSmoothingEnabled = false;
      const r = Math.min(sm.width / mini.width, sm.height / mini.height);
      c2.drawImage(mini, (sm.width - mini.width * r) / 2, (sm.height - mini.height * r) / 2, mini.width * r, mini.height * r);
      b.appendChild(sm);
    }
    const s = document.createElement('span'); s.textContent = label; b.appendChild(s);
    b.onclick = () => { S.forge.stickers.color = key; draw(); updateStickers(); };
    colorRow.appendChild(b); colorButtons.push({ b, key });
  };
  mkColor('', '无彩色贴纸');
  for (const c of STICKER_COLORS) mkColor(c.key, c.key);
  stickSec.body.appendChild(colorRow);
  stickSec.body.appendChild(stickNote);
  right.appendChild(gStick);
  groups.push({
    box: gStick, body: stickSec.body, buttons: [], getValue: () => null, key: 'sticker', gkey: 'stick', note: stickNote, cur: stickSec.cur,
    label: () => {
      if (!forgeType(S.forge.baseType).allows.sticker) return '不适用';
      const st = S.forge.stickers;
      const p = [st.eternal && '永恒', st.perishable && '易腐', st.rental && '租用', st.color].filter(Boolean);
      return p.length ? p.join(' + ') : '无';
    },
  });
  function updateStickers () {
    const allowed = forgeType(S.forge.baseType).allows.sticker;
    const compat = stickerStat();
    const st = S.forge.stickers;
    if (st.eternal && st.perishable) st.perishable = false;
    gStick.style.opacity = allowed ? '1' : '.45';
    for (const b of stickButtons) {
      const k = b.dataset.key;
      let ok = allowed;
      // card.lua's set_eternal / set_perishable also honour per-joker compat flags
      if (k === 'eternal' && !compat.eternal) ok = false;
      if (k === 'perishable' && !compat.perishable) ok = false;
      b.disabled = !ok;
      b.classList.toggle('on', !!st[k]);
    }
    for (const { b, key } of colorButtons) {
      b.disabled = !allowed;
      b.classList.toggle('on', (st.color || '') === key);
    }
    const notes = [];
    if (!allowed) notes.push('贴纸只能贴在小丑牌上');
    else {
      if (!compat.eternal) notes.push('这张小丑牌原本就不能有「永恒」标签（eternal_compat = false）');
      if (!compat.perishable) notes.push('这张小丑牌原本就不能有「易腐」标签（perishable_compat = false）');
      notes.push('永恒与易腐在原版占用卡面同一个位置，因此互斥（点一个会自动取消另一个）；租用与彩色贴纸可以同时存在');
    }
    stickNote.textContent = notes.join('；');
  }
  updateStickers();

  const gBack = group('牌背 Deck（翻到牌背时生效）', FORGE_BACKS, () => S.forge.back, (v) => { S.forge.back = v; }, {
    key: 'back', gkey: 'back',
    cur: () => {
      if (!forgeType(S.forge.baseType).allows.back) return '不适用';
      if (S.forge.showFront) return '显示正面';
      const it = BY_ID[S.forge.back];
      return it ? nm(it) : '无';
    },
  });
  right.appendChild(gBack.box);

  const viewSec = section('view', '显示选项');
  const gToggle = viewSec.box;
  const row = document.createElement('div'); row.className = 'chips';
  const tg = (label, key, invert) => {
    const b = document.createElement('button'); b.className = 'pick nosprite'; b.textContent = label;
    b.onclick = () => { S.forge[key] = !S.forge[key]; draw(); updateChips(); };
    b._sync = () => b.classList.toggle('on', invert ? !S.forge[key] : !!S.forge[key]);
    row.appendChild(b); return b;
  };
  const bBack = tg('翻到牌背', 'showFront', true);
  const bHC = tg('高对比牌面 (colourblind)', 'variants');
  viewSec.body.appendChild(row);
  groups.push({
    buttons: [], getValue: () => null, box: gToggle, body: viewSec.body, key: null, gkey: 'view', note: null,
    cur: viewSec.cur,
    label: () => [S.forge.showFront ? '正面' : '牌背', S.forge.variants ? '高对比' : null].filter(Boolean).join(' · '),
    sync: () => { bBack._sync(); bHC._sync(); },
  });
  right.appendChild(gToggle);

  /* ---- jump bar: tap a chip to open a group and scroll to it ---- */
  const navChip = (key, label) => {
    const b = document.createElement('button');
    b.className = 'nv'; b.dataset.gkey = key; b.textContent = label;
    b.onclick = () => {
      const open = !isOpen(key);
      toggleOpen(key, true);
      const target = document.querySelector('#content .opt[data-gkey="' + key + '"]');
      if (target && !open) target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    };
    nav.appendChild(b);
  };
  for (const [key, label] of NAV_GROUPS) navChip(key, label);
  const navSep = document.createElement('span'); navSep.className = 'nvsep'; nav.appendChild(navSep);
  const openAll = document.createElement('button'); openAll.className = 'nv act'; openAll.textContent = '全部展开';
  openAll.onclick = () => { for (const [k] of NAV_GROUPS) toggleOpen(k, true); for (const k of ['summary', 'export', 'anim']) toggleOpen(k, true) };
  const closeAll = document.createElement('button'); closeAll.className = 'nv act'; closeAll.textContent = '收起';
  closeAll.onclick = () => { for (const [k] of NAV_GROUPS) toggleOpen(k, false); for (const k of ['summary', 'export', 'anim']) toggleOpen(k, false) };
  const randBtn = document.createElement('button'); randBtn.className = 'nv act'; randBtn.textContent = '🎲 随机搭配';
  randBtn.onclick = () => {
    const pickFrom = (list, noneChance) => (list.length && Math.random() > (noneChance || 0)) ? list[Math.floor(Math.random() * list.length)] : null;
    const t = forgeType(S.forge.baseType);
    const base = pickFrom(ITEMS.filter((i) => i.cat === S.forge.baseType));
    if (base) S.forge.base = base.id;
    if (t.allows.enhancement) { const e = pickFrom(FORGE_ENH, 0.35); S.forge.enhancement = e ? e.id : 'none' }
    if (t.allows.edition) { const e = pickFrom(FORGE_EDITIONS, 0.4); S.forge.edition = e ? e.id : '' }
    if (t.allows.seal) { const s = pickFrom(FORGE_SEALS, 0.5); S.forge.seal = s ? s.key : '' }
    if (t.allows.sticker) {
      const st = S.forge.stickers;
      st.eternal = Math.random() < 0.25; st.perishable = false; st.rental = Math.random() < 0.2;
      st.color = Math.random() < 0.25 && STICKER_COLORS.length ? STICKER_COLORS[Math.floor(Math.random() * STICKER_COLORS.length)].key : '';
    }
    if (t.allows.back) { const b = pickFrom(FORGE_BACKS, 0.5); if (b) S.forge.back = b.id }
    build(); typeSel.value = S.forge.baseType; refreshBase(); draw(); updateChips();
    toast('已随机搭配一组');
  };
  const resetBtn = document.createElement('button'); resetBtn.className = 'nv act'; resetBtn.textContent = '↺ 重置';
  resetBtn.onclick = () => {
    S.forge.enhancement = 'none'; S.forge.edition = ''; S.forge.seal = '';
    S.forge.stickers = { eternal: false, perishable: false, rental: false, color: '' };
    S.forge.showFront = true; S.forge.variants = false;
    const first = ITEMS.find((i) => i.cat === S.forge.baseType);
    if (first) S.forge.base = first.id;
    build(); typeSel.value = S.forge.baseType; refreshBase(); draw(); updateChips();
    toast('已重置叠加层');
  };
  nav.appendChild(openAll); nav.appendChild(closeAll); nav.appendChild(randBtn); nav.appendChild(resetBtn);

  build();
  typeSel.value = S.forge.baseType;
  refreshBase();
  draw();
  updateChips();
  syncNav();
  forgeRedraw = () => { draw(); updateChips(); };
}
let forgeRedraw = null;

/* ---------------------------------------------------------------- atlas */
function viewAtlas (root) {
  const head = document.createElement('div'); head.className = 'listhead';
  const files = D.atlasIndex.filter((f) => ATLAS[f.file]);
  head.innerHTML = `<h2>图集浏览</h2><span class="sub">${files.length} 张贴图 · 已内置 2x 高清版本</span><span class="spacer"></span>`;
  const note = document.createElement('span'); note.className = 'chip';
  note.innerHTML = '<b>提示</b> 点击贴图查看格子坐标，点格子可反查使用者';
  head.appendChild(note);
  root.appendChild(head);

  const list = document.createElement('div');
  for (const f of files) {
    const disp = ATLAS[f.file] ? f.file : f.file.replace(/^1x\//, '2x/');
    const row = document.createElement('div'); row.className = 'atarow';
    const h = document.createElement('div'); h.className = 'atahead';
    const a = Object.values(D.atlases).find((x) => x.file === disp);
    h.innerHTML = `<span class="fn">${disp}</span><span class="dim">${f.w}×${f.h}px</span>` +
      (a ? `<span class="dim">· 格子 ${a.px}×${a.py} · ${a.cols}×${a.rows}${a.frames ? ' · ' + a.frames + ' 帧动画' : ''}</span>` : '') +
      '<span class="spacer"></span><span class="dim">展开 ▾</span>';
    row.appendChild(h);
    const body = document.createElement('div'); body.className = 'atabody'; body.style.display = 'none';
    let built = false;
    h.onclick = () => {
      const open = body.style.display === 'none';
      body.style.display = open ? 'block' : 'none';
      if (open && !built) { built = true; buildAtlasBody(body, disp, a, f); }
    };
    row.appendChild(body);
    list.appendChild(row);
  }
  root.appendChild(list);
}
function buildAtlasBody (body, file, a, meta) {
  const wrap = document.createElement('div'); wrap.className = 'wrap';
  const im = img(file);
  const showW = Math.min(meta.w, 1400);
  const ratio = showW / meta.w;
  const im2 = document.createElement('img');
  im2.src = ATLAS[file];
  im2.style.width = showW + 'px';
  im2.style.height = (meta.h * ratio) + 'px';
  wrap.appendChild(im2);
  const info = document.createElement('div'); info.className = 'tileinfo'; info.textContent = '把鼠标移到贴图上查看格子信息';
  if (a) {
    const ov = document.createElement('div'); ov.className = 'gridov';
    ov.style.width = showW + 'px'; ov.style.height = (meta.h * ratio) + 'px';
    const tw = a.px * (meta.w / a.w) * (a.scale ? 1 : 1);
    const cw = a.px * a.scale * ratio, ch = a.py * a.scale * ratio;
    for (let y = 0; y < a.rows; y++) for (let x = 0; x < a.cols; x++) {
      const i = document.createElement('i');
      i.style.left = (x * cw) + 'px'; i.style.top = (y * ch) + 'px';
      i.style.width = cw + 'px'; i.style.height = ch + 'px';
      ov.appendChild(i);
    }
    wrap.appendChild(ov);
    wrap.onmousemove = (e) => {
      const r = wrap.getBoundingClientRect();
      const px = (e.clientX - r.left) / ratio, py = (e.clientY - r.top) / ratio;
      const gx = Math.floor(px / (a.px * a.scale)), gy = Math.floor(py / (a.py * a.scale));
      if (gx < 0 || gy < 0 || gx >= a.cols || gy >= a.rows) { info.textContent = ''; return; }
      const users = ITEMS.filter((it) => it.atlas === a.name && it.pos && it.pos.x === gx && it.pos.y === gy);
      info.textContent = `格 (${gx}, ${gy})  像素 (${gx * a.px * a.scale}, ${gy * a.py * a.scale})  ${a.px * a.scale}×${a.py * a.scale}px   → ` +
        (users.length ? users.map((u) => nm(u)).join('、') : (a.frames ? '动画帧 ' + gx : '未使用'));
      if (users.length) info.dataset.first = users[0].id; else delete info.dataset.first;
    };
    wrap.onclick = () => { if (info.dataset.first) selectItem(info.dataset.first, true); };
  }
  body.appendChild(wrap);
  body.appendChild(info);
  const btn = document.createElement('button'); btn.className = 'btn'; btn.textContent = '⤓ 导出整张贴图 PNG';
  btn.onclick = () => {
    const raw = ATLAS[file];
    fetch(raw).then((r) => r.arrayBuffer()).then((b) => save(new Uint8Array(b), file.split('/').pop(), 'image/png')).catch(() => {
      const c = newCanvas(meta.w, meta.h); const ctx = c.getContext('2d');
      img(file).onload = () => { ctx.drawImage(img(file), 0, 0); c.toBlob((bl) => save(bl, file.split('/').pop(), 'image/png')); };
      if (img(file).complete) { ctx.drawImage(img(file), 0, 0); c.toBlob((bl) => save(bl, file.split('/').pop(), 'image/png')); }
    });
  };
  body.appendChild(btn);
  if (a) {
    const b2 = document.createElement('button'); b2.className = 'btn'; b2.style.marginLeft = '6px';
    b2.textContent = '⤓ 导出全部切片 ZIP';
    b2.onclick = async () => {
      toast('正在切片…');
      const files = [];
      for (let y = 0; y < a.rows; y++) for (let x = 0; x < a.cols; x++) {
        const c = newCanvas(a.px * a.scale, a.py * a.scale);
        drawTileTo(c.getContext('2d'), { atlas: a.name, pos: { x, y } }, 0, 0, c.width, c.height);
        await ensureDrawn();
        files.push({ name: `${file.split('/').pop().replace(/\.png$/, '')}_${x}_${y}.png`, data: await canvasBytes(c) });
      }
      save(zipStore(files), `${file.split('/').pop().replace(/\.png$/, '')}_tiles.zip`, 'application/zip');
      toast('已导出切片 ZIP');
    };
    body.appendChild(b2);
  }
}

/* ---------------------------------------------------------------- shaders */
const SHADER_TO_EDITION = { foil: 'e_foil', holo: 'e_holo', polychrome: 'e_polychrome', negative: 'e_negative', negative_shine: 'e_negative' };
const SHADER_TO_LABEL = {
  foil: '闪箔 Foil', holo: '镭射 Holographic', polychrome: '多彩 Polychrome', negative: '负片 Negative',
  negative_shine: '负片光泽层（与 negative 合用）', booster: '补充包 / 幽灵牌', voucher: '优惠券 / 黄金蜡封 / 贴纸',
  hologram: '全息小丑的悬浮立绘',
};
/** A representative render for each ported shader. */
function shaderPreview (name) {
  const phase = phaseNow();
  const ace = { atlas: 'cards_1', pos: { x: 12, y: 3 } };
  const baseCenter = { atlas: 'centers', pos: COM.baseCenter.pos };
  if (name === 'booster') return compose({ center: { atlas: 'Spectral', pos: { x: 2, y: 2 } }, setShader: 'booster' }, 2, phase);
  if (name === 'voucher') return compose({ center: { atlas: 'Voucher', pos: { x: 0, y: 0 } }, setShader: 'voucher' }, 2, phase);
  if (name === 'negative_shine') {
    // show this layer on its own, so it is not confused with the full negative card
    const ace = { atlas: 'cards_1', pos: { x: 12, y: 3 } };
    const t = compose({ center: { atlas: 'centers', pos: COM.baseCenter.pos }, front: ace }, 2, phase);
    return shade(t, 'negative_shine', phase) || t;
  }
  if (name === 'hologram') {
    const sp = { atlas: 'Joker', pos: { x: 2, y: 9 } };
    return shadeTile(sp, CARD_W * 2, CARD_H * 2, 'hologram', phase) || tileLayer(sp, CARD_W * 2, CARD_H * 2);
  }
  return compose({ center: baseCenter, front: ace, edition: SHADER_TO_EDITION[name] || null }, 2, phase);
}
function viewShaders (root) {
  const live = D.shaders.filter((s) => s.live).length;
  const head = document.createElement('div'); head.className = 'listhead';
  head.innerHTML = `<h2>着色器 Shader</h2><span class="sub">${D.shaders.length} 个片段着色器 · 其中 ${live} 个已逐行移植为 WebGL 实时预览</span><span class="spacer"></span>`;
  const note = document.createElement('span'); note.className = 'chip';
  note.innerHTML = '<b>相位</b> 用顶栏滑杆切换定格瞬间';
  head.appendChild(note);
  root.appendChild(head);

  const intro = document.createElement('div'); intro.className = 'hint';
  intro.style.marginBottom = '12px';
  intro.innerHTML = '卡牌的「版本」外观（闪箔 / 镭射 / 多彩 / 负片）在原版里不是图片，而是 <code>resources/shaders/*.fs</code> 里的 GLSL 片段着色器。下面把 19 个着色器全部列出，其中 5 个已移植到本页面的 WebGL 管线，<b>预览就是原版画面</b>。';
  root.appendChild(intro);

  for (const s of D.shaders) {
    const row = document.createElement('div'); row.className = 'atarow';
    const h = document.createElement('div'); h.className = 'atahead';
    h.innerHTML = `<span class="fn">${esc(s.name)}.fs</span>` +
      (s.live ? '<span class="tag" style="border-color:var(--accent);color:var(--accent)">实时预览</span>' : '') +
      `<span class="dim">${(s.size / 1024).toFixed(1)} KB</span>` +
      `<span class="dim">${esc(s.note || '')}</span>` +
      '<span class="spacer"></span><span class="dim">展开 ▾</span>';
    row.appendChild(h);
    const body = document.createElement('div'); body.className = 'atabody'; body.style.display = 'none';
    let built = false;
    h.onclick = () => {
      const open = body.style.display === 'none';
      body.style.display = open ? 'block' : 'none';
      if (open && !built) { built = true; buildShaderBody(body, s); }
    };
    row.appendChild(body);
    root.appendChild(row);
  }
}
function buildShaderBody (body, s) {
  if (s.live && GL) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;gap:18px;align-items:flex-start;flex-wrap:wrap;margin-bottom:10px';
    const box = document.createElement('div');
    box.style.cssText = 'padding:12px;border-radius:10px;background:repeating-conic-gradient(#1a242e 0% 25%,#141d26 0% 50%) 50%/16px 16px';
    const out = shaderPreview(s.name);
    const shown = newCanvas(out.width, out.height);
    shown.getContext('2d').drawImage(out, 0, 0);
    shown.style.cssText = 'width:142px;height:190px;display:block;image-rendering:pixelated';
    box.appendChild(shown);
    const cap = document.createElement('div'); cap.className = 'hint'; cap.style.textAlign = 'center';
    cap.textContent = s.name === 'hologram' ? '应用在悬浮立绘上' : '原版效果';
    box.appendChild(cap);
    const side = document.createElement('div');
    side.innerHTML = `<div class="hint" style="max-width:380px">用于 <b>${esc(SHADER_TO_LABEL[s.name] || s.name)}</b>。<br>` +
      '在「卡牌合成台」里也能叠加观察，并可导出 PNG / APNG 动图。</div>';
    const b = document.createElement('button'); b.className = 'btn primary'; b.style.marginTop = '8px';
    b.textContent = '⚒ 去合成台看效果';
    b.onclick = () => {
      if (SHADER_TO_EDITION[s.name]) { S.forge.edition = SHADER_TO_EDITION[s.name]; }
      else if (s.name === 'booster') { S.forge.baseType = 'Spectral'; S.forge.base = 'c_soul'; }
      else if (s.name === 'voucher') { S.forge.baseType = 'Voucher'; S.forge.base = 'v_hone'; }
      else if (s.name === 'hologram') { S.forge.baseType = 'Joker'; S.forge.base = 'j_hologram'; }
      S.tab = 'forge'; render();
    };
    side.appendChild(b);
    wrap.appendChild(box); wrap.appendChild(side);
    body.appendChild(wrap);
  } else if (s.live) {
    const n = document.createElement('div'); n.className = 'hint';
    n.textContent = '当前浏览器未启用 WebGL，无法实时预览（源码仍可查看与导出）。';
    body.appendChild(n);
  }
  const pre = document.createElement('pre'); pre.className = 'cfgbox'; pre.style.maxHeight = '420px';
  pre.textContent = s.source;
  body.appendChild(pre);
  const bar = document.createElement('div'); bar.style.marginTop = '8px';
  const b1 = document.createElement('button'); b1.className = 'btn'; b1.textContent = '⤓ 导出 .fs 源文件';
  b1.onclick = () => downloadText(s.source, `${s.name}.fs`, 'text/plain;charset=utf-8');
  const b2 = document.createElement('button'); b2.className = 'btn'; b2.style.marginLeft = '6px'; b2.textContent = '⧉ 复制源码';
  b2.onclick = () => navigator.clipboard?.writeText(s.source).then(() => toast('已复制源码'), () => toast('复制失败'));
  bar.appendChild(b1); bar.appendChild(b2);
  body.appendChild(bar);
}

/* ---------------------------------------------------------------- hands */
function viewHands (root) {
  const head = document.createElement('div'); head.className = 'listhead';
  head.innerHTML = `<h2>牌型数据</h2><span class="sub">${D.hands.length} 种牌型 · 基础筹码/倍率与每级成长</span>`;
  root.appendChild(head);
  const tbl = document.createElement('table'); tbl.className = 'data';
  tbl.innerHTML = '<thead><tr><th>牌型</th><th>示例</th><th class="num">基础筹码</th><th class="num">基础倍率</th><th class="num">每级 +筹码</th><th class="num">每级 +倍率</th><th class="num">1 级分</th><th class="num">5 级分</th></tr></thead><tbody></tbody>';
  const tb = tbl.querySelector('tbody');
  for (const h of D.hands) {
    const tr = document.createElement('tr');
    const ex = h.example.slice(0, 5);
    const holder = document.createElement('div');
    holder.style.cssText = 'display:flex;gap:1px';
    for (const k of ex) {
      const it = BY_ID[k];
      if (!it) continue;
      const mini = compose({ center: { atlas: 'centers', pos: COM.baseCenter.pos }, front: { atlas: 'cards_1', pos: it.pos } }, 1);
      mini.style.cssText = 'width:26px;height:35px;image-rendering:pixelated';
      holder.appendChild(mini);
    }
    const nameTd = document.createElement('td');
    nameTd.innerHTML = `<b>${esc(h.i18n[S.lang] || h.name)}</b>${h.visible ? '' : ' <span class="tag">隐藏牌型</span>'}`;
    tr.appendChild(nameTd);
    const exTd = document.createElement('td'); exTd.appendChild(holder); tr.appendChild(exTd);
    const lvl = (n) => h.chips + h.l_chips * (n - 1) + (h.mult + h.l_mult * (n - 1));
    tr.insertAdjacentHTML('beforeend', `<td class="num">${h.chips}</td><td class="num">${h.mult}</td><td class="num">+${h.l_chips}</td><td class="num">+${h.l_mult}</td><td class="num">${lvl(1)}</td><td class="num">${lvl(5)}</td>`);
    tb.appendChild(tr);
  }
  { const w = document.createElement('div'); w.className = 'tablewrap'; w.appendChild(tbl); root.appendChild(w) }
  const note = document.createElement('div'); note.className = 'hint';
  note.innerHTML = '说明：等级分的计算方式与原版一致（筹码 + 倍率之和，仅用于排序参考）。<br>示例牌面取自 <code>game.lua</code> 中每手牌的 <code>example</code> 字段。';
  root.appendChild(note);
}

/* ---------------------------------------------------------------- data */
const DATA_COLS = [
  ['id', 'ID'], ['cat', '分类'], ['set', 'Set'], ['name', '名称'], ['rarity', '稀有度'], ['cost', '费用'],
  ['weight', '权重'], ['kind', '类型'], ['effect', '效果'], ['atlas', '图集'], ['pos', '坐标'], ['order', '顺序'],
];
let dataSort = { key: 'id', dir: 1 };
function viewData (root) {
  let list = currentList();
  const head = document.createElement('div'); head.className = 'listhead';
  head.innerHTML = `<h2>数据总表</h2><span class="sub">${list.length} 行 · 点击表头排序 · 点击行查看详情</span><span class="spacer"></span>`;
  const b1 = document.createElement('button'); b1.className = 'tbtn'; b1.textContent = '⤓ CSV';
  b1.onclick = () => downloadText(toCSV(list), `balatro-data-${safeName(S.cat)}.csv`, 'text/csv;charset=utf-8');
  const b2 = document.createElement('button'); b2.className = 'tbtn'; b2.textContent = '⤓ JSON';
  b2.onclick = () => downloadText(JSON.stringify({ meta: D.meta, items: list.map(itemJSON) }, null, 1), `balatro-data-${safeName(S.cat)}.json`, 'application/json');
  const b3 = document.createElement('button'); b3.className = 'tbtn'; b3.textContent = '⤓ Markdown';
  b3.onclick = () => {
    const md = ['# Balatro 数据表 — ' + S.cat, '', '| ' + DATA_COLS.map((c) => c[1]).join(' | ') + ' |', '|' + DATA_COLS.map(() => '---').join('|') + '|']
      .concat(list.map((it) => '| ' + [it.id, it.cat, it.set, nm(it), it.rarity ?? '', it.cost ?? '', it.weight ?? '', it.kind ?? '', it.effect ?? '', it.atlas ?? '', it.pos ? it.pos.x + ',' + it.pos.y : '', it.order].map((v) => String(v).replace(/\|/g, '\\|')).join(' | ') + ' |')).join('\r\n');
    downloadText(md, `balatro-data-${safeName(S.cat)}.md`, 'text/markdown;charset=utf-8');
  };
  head.appendChild(b1); head.appendChild(b2); head.appendChild(b3);
  root.appendChild(head);

  const key = dataSort.key, dir = dataSort.dir;
  list = list.slice().sort((a, b) => {
    let va; let vb;
    if (key === 'name') { va = nm(a); vb = nm(b); }
    else if (key === 'pos') { va = a.pos ? a.pos.x + a.pos.y * 100 : -1; vb = b.pos ? b.pos.x + b.pos.y * 100 : -1; }
    else { va = a[key] ?? ''; vb = b[key] ?? ''; }
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
    return String(va).localeCompare(String(vb), 'zh') * dir;
  });
  const tbl = document.createElement('table'); tbl.className = 'data';
  const thead = document.createElement('thead'); const trh = document.createElement('tr');
  for (const [k, label] of DATA_COLS) {
    const th = document.createElement('th'); th.textContent = label + (dataSort.key === k ? (dataSort.dir > 0 ? ' ▲' : ' ▼') : '');
    th.onclick = () => { dataSort = { key: k, dir: dataSort.key === k ? -dataSort.dir : 1 }; render(); };
    trh.appendChild(th);
  }
  thead.appendChild(trh); tbl.appendChild(thead);
  const tb = document.createElement('tbody');
  for (const it of list.slice(0, 800)) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="id">${esc(it.id)}</td><td>${esc(it.cat)}</td><td>${esc(it.set || '')}</td><td>${esc(nm(it))}</td>` +
      `<td>${it.rarity ? RARITY[it.rarity] : ''}</td><td class="num">${it.cost ?? ''}</td><td class="num">${it.weight ?? ''}</td>` +
      `<td>${esc(it.kind || '')}</td><td>${esc(it.effect || '')}</td><td>${esc(it.atlas || '')}</td>` +
      `<td>${it.pos ? it.pos.x + ',' + it.pos.y : ''}</td><td class="num">${it.order ?? ''}</td>`;
    tr.onclick = () => selectItem(it.id);
    tb.appendChild(tr);
  }
  tbl.appendChild(tb);
  { const w = document.createElement('div'); w.className = 'tablewrap'; w.appendChild(tbl); root.appendChild(w) }
  if (list.length > 800) root.appendChild(Object.assign(document.createElement('div'), { className: 'hint', textContent: `仅显示前 800 行（共 ${list.length} 行）；导出文件包含全部。` }));
}

/* ---------------------------------------------------------------- detail */
function selectItem (id, silent) {
  S.sel = id;
  if (!silent) S.tab = 'codex';
  render();
  const d = document.getElementById('detail');
  if (d && !silent) d.scrollTop = 0;
  if (isNarrow()) toggleDrawer('detail-open', true); // phones: slide the detail panel in
}
function renderDetail () {
  const d = document.getElementById('detail');
  const it = S.sel ? BY_ID[S.sel] : null;
  if (!it) {
    d.className = 'empty';
    d.innerHTML = '<div><div style="font-size:30px;opacity:.3">🂡</div><div style="margin-top:10px">从左侧选一项查看详情<br><span style="font-size:11.5px">支持搜索 <kbd>/</kbd>，如 <kbd>cat:Joker cost&gt;=5</kbd></span></div></div>';
    return;
  }
  d.className = '';
  d.innerHTML = '';
  const closeBtn = document.createElement('button');
  closeBtn.className = 'btn'; closeBtn.id = 'detailClose'; closeBtn.textContent = '✕'; closeBtn.title = '关闭';
  closeBtn.onclick = () => closeDrawers();
  d.appendChild(closeBtn);
  const spec = specForItem(it);
  const head = document.createElement('div'); head.className = 'dhead';
  const r1 = document.createElement('div'); r1.className = 'row1';
  const previewHolder = document.createElement('div');
  previewHolder.style.cssText = 'flex:0 0 auto;width:110px;touch-action:none';
  const paintPreview = () => {
    const sp = specForItem(it);
    previewHolder.innerHTML = '';
    if (!sp) return;
    const cv = compose(sp, 3, phaseNow());
    cv.style.width = previewWidth(cv, 110) + 'px'; cv.style.height = 'auto';
    cv.style.pointerEvents = 'none';
    previewHolder.appendChild(cv);
  };
  if (spec) { r1.appendChild(previewHolder); paintPreview(); }
  const meta = document.createElement('div'); meta.style.minWidth = '0'; meta.style.flex = '1';
  meta.innerHTML = `<h3>${esc(nm(it))}</h3><div class="id">${esc(it.id)}</div>`;
  const tags = document.createElement('div'); tags.className = 'tags';
  const addTag = (t, col) => { const s = document.createElement('span'); s.className = 'tag'; s.textContent = t; if (col) { s.style.borderColor = col; s.style.color = col; } tags.appendChild(s); };
  addTag(categoryLabel(it.cat));
  if (it.source) addTag('MOD · ' + (it.sourceName || it.source), '#a782d1');
  if (it.rarity) addTag(RARITY[it.rarity], D.colors.palette.rarity[it.rarity - 1]);
  if (it.cost != null) addTag('$' + it.cost, D.colors.tags.money);
  if (it.kind) addTag(it.kind);
  if (it.stake_level) addTag('底注等级 ' + it.stake_level);
  if (it.effect) addTag(it.effect);
  if (it.unlocked === false) addTag('未解锁');
  meta.appendChild(tags);
  r1.appendChild(meta);
  head.appendChild(r1);
  d.appendChild(head);

  const sect = (title) => { const s = document.createElement('div'); s.className = 'sect'; if (title) { const h = document.createElement('h4'); h.textContent = title; s.appendChild(h); } d.appendChild(s); return s; };

  if (it.source) {
    const s0 = sect('来源');
    const box = document.createElement('div'); box.className = 'names';
    box.innerHTML = `<div class="n"><i>Mod</i><span>${esc(it.sourceName || it.source)}</span></div>
      <div class="n"><i>Mod ID</i><span class="mono">${esc(it.source)}</span></div>` +
      (it.modFile ? `<div class="n"><i>声明于</i><span class="mono">${esc(it.modFile)}${it.modLine ? ':' + it.modLine : ''}</span></div>` : '') +
      `<div class="n"><i>原始键</i><span class="mono">${esc(it.set || '')}${it.cat && it.set && it.set !== it.cat ? ' / ' + esc(it.cat) : ''}</span></div>`;
    s0.appendChild(box);
    const btns = document.createElement('div'); btns.className = 'btns'; btns.style.marginTop = '9px';
    const b1 = document.createElement('button'); b1.className = 'btn';
    const filtered = S.source === it.source;
    b1.textContent = filtered ? '← 显示全部来源' : '只看这个 Mod 的内容';
    b1.title = filtered ? '当前就在只显示这个 Mod，点一下恢复全部来源' : '把图鉴筛选到这个 Mod 的内容';
    b1.onclick = () => {
      S.source = filtered ? 'all' : it.source;
      S.cat = 'all'; S.tab = 'codex';
      render();
      toast(filtered ? '已显示全部来源' : '只看 ' + (it.sourceName || it.source));
    };
    btns.appendChild(b1);
    s0.appendChild(btns);
  }

  const s1 = sect('描述');
  const dv = document.createElement('div'); dv.className = 'desc'; dv.innerHTML = descHTML(it);
  s1.appendChild(dv);
  if (it.note) {
    const nt = document.createElement('div');
    nt.className = 'hint'; nt.style.marginTop = '8px'; nt.style.color = 'var(--accent)';
    nt.textContent = it.note;
    s1.appendChild(nt);
  }

  // blind_chips is a 21-frame animation atlas — let the frame be scrubbed here
  if (it.cat === 'Blind' && it.pos) {
    const frames = (atlas('blind_chips') || {}).frames || 21;
    const s = sect('动画帧');
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:9px;flex-wrap:wrap';
    const sl = document.createElement('input');
    sl.type = 'range'; sl.min = '0'; sl.max = String(frames - 1); sl.step = '1'; sl.value = String(S.blindFrame);
    sl.style.cssText = 'flex:1;min-width:140px;accent-color:var(--accent)';
    const lab = document.createElement('span'); lab.className = 'mono'; lab.style.color = 'var(--fg3)';
    const setLab = () => { lab.textContent = `帧 ${S.blindFrame} / ${frames}`; };
    setLab();
    const play = document.createElement('button'); play.className = 'btn'; play.textContent = '▶ 播放';
    sl.oninput = () => { S.blindFrame = +sl.value; setLab(); paintPreview(); };
    play.onclick = () => {
      if (detailTimer) { clearInterval(detailTimer); detailTimer = null; play.textContent = '▶ 播放'; play.classList.remove('primary'); return; }
      play.textContent = '⏸ 暂停'; play.classList.add('primary');
      detailTimer = setInterval(() => {
        S.blindFrame = (S.blindFrame + 1) % frames;
        sl.value = String(S.blindFrame); setLab(); paintPreview();
      }, 110);
    };
    row.appendChild(sl); row.appendChild(lab); row.appendChild(play);
    s.appendChild(row);
    const h = document.createElement('div'); h.className = 'hint';
    h.textContent = `盲注贴图 BlindChips.png 是一张 ${frames} 帧的横向动画图集（每行一个盲注，${(atlas('blind_chips') || {}).px}×${(atlas('blind_chips') || {}).py} 像素一格）。拖动滑杆或播放即可逐帧查看，导出时输出当前帧。`;
    s.appendChild(h);
  }

  const langs = Object.keys(it.i18n || {}).filter((c) => c !== S.lang);
  if (langs.length) {
    const ns = sect('其它语言名称');
    const box = document.createElement('div'); box.className = 'names';
    for (const c of langs) box.innerHTML += `<div class="n"><i>${langLabel(c)}</i><span>${esc(it.i18n[c])}</span></div>`;
    ns.appendChild(box);
  }
  const txlangs = Object.keys(it.text || {}).filter((c) => c !== S.lang && (it.text[c] || []).length);
  if (txlangs.length) {
    const s2 = sect('其它语言描述');
    for (const c of txlangs) {
      const b = document.createElement('div'); b.style.marginBottom = '8px';
      b.innerHTML = `<div style="font-size:11px;color:var(--fg3);margin-bottom:2px">${langLabel(c)}</div><div class="desc">${(it.text[c] || []).map((l) => `<span class="ln">${markup(l)}</span>`).join('')}</div>`;
      s2.appendChild(b);
    }
  }

  const sp = sect('贴图信息');
  const a = it.atlas ? D.atlases[it.atlas] : null;
  const kv = document.createElement('table'); kv.className = 'kv';
  const row = (k, v) => `<tr><td>${k}</td><td>${v}</td></tr>`;
  kv.innerHTML =
    row('图集 Atlas', it.atlas ? esc(it.atlas) : '—') +
    row('纹理文件', a ? esc(a.file) + ` <span style="color:var(--fg3)">(${a.w}×${a.h})</span>` : '—') +
    row('格子坐标', it.pos ? `x=${it.pos.x}, y=${it.pos.y}` : '—') +
    row('单格尺寸', a ? `${a.px}×${a.py} (1x) / ${a.px * a.scale}×${a.py * a.scale} (${a.scale}x 文件)` : `${CARD_W}×${CARD_H}`) +
    row('像素裁剪', it.pos && a ? `left=${it.pos.x * a.px * a.scale}, top=${it.pos.y * a.py * a.scale}, w=${a.px * a.scale}, h=${a.py * a.scale}` : '整图');
  sp.appendChild(kv);

  const s3 = sect('导出');
  const btns = document.createElement('div'); btns.className = 'btns';
  const mk = (label, fn, cls) => { const b = document.createElement('button'); b.className = 'btn' + (cls || ''); b.textContent = label; b.onclick = fn; btns.appendChild(b); return b; };
  mk('⤓ PNG 1x', () => exportItemPNG(it, 1), ' primary');
  mk('⤓ PNG 2x', () => exportItemPNG(it, 2));
  mk('⤓ PNG 4x', () => exportItemPNG(it, 4));
  mk('⤓ PNG 6x', () => exportItemPNG(it, 6));
  mk('⤓ SVG', () => exportItemSVG(it, 2));
  mk('⤓ 单张 ZIP', async () => {
    const cv = compose(spec, 2); await ensureDrawn();
    const enc = new TextEncoder();
    const files = [{ name: `${it.id}.png`, data: await canvasBytes(cv) }, { name: `${it.id}.json`, data: enc.encode(JSON.stringify(itemJSON(it), null, 2)) }];
    save(zipStore(files), `${safeName(it.id)}.zip`, 'application/zip'); toast('已导出 ZIP');
  });
  mk('⧉ 复制链接', copyLink);
  mk('⧉ 复制 JSON', () => navigator.clipboard?.writeText(JSON.stringify(itemJSON(it), null, 2)).then(() => toast('已复制 JSON'), () => toast('复制失败')));
  mk('⧉ 复制坐标', () => navigator.clipboard?.writeText(it.pos ? `${it.atlas} (${it.pos.x}, ${it.pos.y})` : '无坐标').then(() => toast('已复制坐标'), () => toast('复制失败')));
  s3.appendChild(btns);
  const hint = document.createElement('div'); hint.className = 'hint';
  hint.textContent = '全部导出均为透明背景；PNG 使用最近邻缩放保持像素风。';
  s3.appendChild(hint);

  if (hasAnim(it)) {
    const s3b = sect('动态效果');
    const row = document.createElement('div'); row.className = 'btns';
    const btns2 = document.createElement('div'); btns2.className = 'btns';
    const animBtn = document.createElement('button'); animBtn.className = 'btn'; animBtn.textContent = '▶ 实时动画预览';
    animBtn.onclick = () => {
      if (S.anim.on) { stopAnim(); animBtn.textContent = '▶ 实时动画预览'; animBtn.classList.remove('primary'); paintPreview(); return; }
      animBtn.textContent = '⏸ 停止动画'; animBtn.classList.add('primary');
      startAnim(() => paintPreview());
    };
    btns2.appendChild(animBtn);
    const apng = document.createElement('button'); apng.className = 'btn primary'; apng.textContent = '🎞 导出 APNG 动图';
    apng.onclick = () => {
      const spec = specForItem(it);
      if (spec.standalone && spec.standalone.atlas === 'blind_chips') {
        const r = blindAnimFrames(it, 2);
        saveAnimAPNG(r.frames, r.delay, `${safeName(it.id)}_动画.png`);
      } else {
        const r = buildAnimFrames(spec, 2, animOpts());
        saveAnimAPNG(r.frames, r.delay, `${safeName(it.id)}_动画.png`);
      }
    };
    btns2.appendChild(apng);
    const gif = document.createElement('button'); gif.className = 'btn primary'; gif.textContent = '🎞 导出 GIF 动图';
    gif.onclick = () => {
      const spec = specForItem(it);
      toast('正在渲染并量化 GIF…');
      setTimeout(() => {
        try {
          if (spec.standalone && spec.standalone.atlas === 'blind_chips') {
            const r = blindAnimFrames(it, 2);
            saveAnimGIF(r.frames, r.delay, `${safeName(it.id)}_动图.gif`, S.gifBg);
          } else {
            const r = buildAnimFrames(spec, 2, animOpts());
            saveAnimGIF(r.frames, r.delay, `${safeName(it.id)}_动图.gif`, S.gifBg);
          }
        } catch (e) { toast('GIF 生成失败：' + e.message) }
      }, 30);
    };
    btns2.appendChild(gif);
    const fz = document.createElement('button'); fz.className = 'btn'; fz.textContent = '🎞 导出帧序列 ZIP';
    fz.onclick = () => {
      const spec = specForItem(it);
      if (spec.standalone && spec.standalone.atlas === 'blind_chips') {
        const r = blindAnimFrames(it, 2);
        saveFrameZip(r.frames, r.delay, `${safeName(it.id)}_帧序列.zip`);
      } else {
        const r = buildAnimFrames(spec, 2, animOpts());
        saveFrameZip(r.frames, r.delay, `${safeName(it.id)}_帧序列.zip`);
      }
    };
    btns2.appendChild(fz);
    const seamInfo = document.createElement('div'); seamInfo.className = 'hint mono';
    if (!(spec.standalone)) {
      animInfoAsync(specForItem(it), (info) => {
        if (info === undefined) { seamInfo.textContent = '循环接缝计算中…'; return }
        if (!info || !info.seam) { seamInfo.textContent = ''; return }
        const m = info.seam;
        seamInfo.textContent = `循环接缝 ${(m.seam * 100).toFixed(2)}% ／ 平均帧差 ${(m.avg * 100).toFixed(2)}% → 接缝比 ${m.ratio.toFixed(2)}（越接近 1 越顺）`
          + (info.autoPeriod ? ` · 已按检测到的循环点 ${info.autoPeriod.toFixed(2)}s 导出` : '');
      });
    }
    btns2.appendChild(seamInfo);
    s3b.appendChild(btns2);
    const h2 = document.createElement('div'); h2.className = 'hint';
    h2.innerHTML = '这一项在原版里是<b>代码驱动的动态效果</b>（着色器流光 / 悬浮立绘 / 逐帧动画）。<br>' +
      '<b>速度</b>与<b>循环方式</b>沿用合成台的设置（默认 4× 加速 + 来回循环）。游戏里是 1× 实时速度，一个完整周期长达二三十秒，所以默认加速才能在几秒内看全。<br>' +
      '<b>GIF</b>：任何看图软件（含 Windows 自带照片）都能看到动画，代价是 256 色。<br>' +
      '<b>APNG</b>：全彩带透明，画质更好，但 Windows 自带照片查看器只会显示第一帧，需要用浏览器等支持 APNG 的工具打开。<br>' +
      '「帧序列 ZIP」输出逐帧 PNG，方便导入 PR / AE / Aseprite。' +
      (it.cat === 'Blind' ? '<br>盲注贴图有 21 帧，其中大部分是同一姿势的静止帧，导出时会自动去重，只保留真正变化的帧。' : '');
    s3b.appendChild(h2);
    if (!GL) {
      const w = document.createElement('div'); w.className = 'hint'; w.style.color = 'var(--red)';
      w.textContent = '当前浏览器未启用 WebGL，着色器类动画无法渲染。';
      s3b.appendChild(w);
    }
  }

  if (['Enhancement', 'Edition', 'Seal', 'Sticker'].includes(it.cat)) {
    const s4 = sect('应用到任意牌上预览');
    const p = document.createElement('div'); p.className = 'hint';
    p.textContent = '打开「卡牌合成台」，即可把本项叠加到任意扑克牌上查看外观变化并导出。';
    const b = document.createElement('button'); b.className = 'btn primary'; b.style.marginTop = '8px';
    b.textContent = '⚒ 前往合成台';
    b.onclick = () => {
      if (it.cat === 'Enhancement') S.forge.enhancement = it.id;
      if (it.cat === 'Edition') S.forge.edition = it.id;
      if (it.cat === 'Seal') S.forge.seal = it.key;
      if (it.cat === 'Sticker') {
        S.forge.baseType = 'Joker';
        S.forge.base = 'j_joker';
        if (['eternal', 'perishable', 'rental'].includes(it.key)) S.forge.stickers[it.key] = true;
        else S.forge.stickers.color = it.key;
      }
      S.tab = 'forge'; render();
    };
    s4.appendChild(p); s4.appendChild(b);
  }

  const s5 = sect('原始数据');
  const cfg = document.createElement('div'); cfg.className = 'cfgbox';
  cfg.textContent = JSON.stringify(it.raw && Object.keys(it.raw).length ? it.raw : it.config, (k, v) => (typeof v === 'function' ? '[function]' : v), 1);
  s5.appendChild(cfg);
  if (it.textRaw && Object.keys(it.textRaw).length) {
    const raw = document.createElement('div'); raw.className = 'cfgbox'; raw.style.marginTop = '8px'; raw.style.color = '#8fa4b5';
    raw.textContent = JSON.stringify(it.textRaw, null, 1);
    const lbl = document.createElement('div'); lbl.className = 'hint'; lbl.textContent = '原始本地化文本（含 #n# 占位符）：';
    s5.appendChild(lbl); s5.appendChild(raw);
  }
  const rawBtn = document.createElement('button'); rawBtn.className = 'btn'; rawBtn.style.marginTop = '8px';
  rawBtn.textContent = '⧉ 复制原始 Lua 表';
  rawBtn.onclick = () => navigator.clipboard?.writeText(cfg.textContent).then(() => toast('已复制'), () => toast('复制失败'));
  s5.appendChild(rawBtn);
}

/* ================================================================ 得分计算器
 * 顺序严格照 state_events.lua 的 evaluate_play：
 *   ① 牌型基础（含等级）→ ② 每张打出的牌（点数 + 强化 + 版本 + 蜡封重复 + 逐牌小丑）
 *   → ③ 留在手里的牌（钢铁等）→ ④ 每个小丑（版本 → 主效果）→ ⑤ 手填修正
 *   最终 = floor(chips × mult)
 * 小丑规则来自 Card:calculate_joker，由 .work/gen-rules.js 从游戏自己的 card.lua 抽出。 */
const RANK_CHIPS = { 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10, J: 10, Q: 10, K: 10, A: 11 };
const RANK_ID = { 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10, J: 11, Q: 12, K: 13, A: 14 };
const SUIT_EN = { S: 'Spades', H: 'Hearts', D: 'Diamonds', C: 'Clubs' };
/* 花色的各语言名字 —— 直接从游戏本地化文件的 suits_plural 里读出来（由 patch-cards.js 生成），
   所以 52 张扑克牌的名字是"红桃A / 方片10 / 黑桃K"这种，和游戏里一致。 */
const PC_SUITS = {"de":{"Clubs":"Kreuz","Diamonds":"Karo","Hearts":"Herz","Spades":"Piks"},"en-us":{"Clubs":"Clubs","Diamonds":"Diamonds","Hearts":"Hearts","Spades":"Spades"},"es_419":{"Clubs":"Tréboles","Diamonds":"Diamantes","Hearts":"Corazones","Spades":"Espadas"},"es_ES":{"Clubs":"Tréboles","Diamonds":"Diamantes","Hearts":"Corazones","Spades":"Picas"},"fr":{"Clubs":"Trèfles","Diamonds":"Carreaux","Hearts":"Cœurs","Spades":"Piques"},"id":{"Clubs":"Keriting","Diamonds":"Wajik","Hearts":"Hati","Spades":"Sekop"},"it":{"Clubs":"Fiori","Diamonds":"Quadri","Hearts":"Cuori","Spades":"Picche"},"ja":{"Clubs":"クラブ","Diamonds":"ダイヤ","Hearts":"ハート","Spades":"スペード"},"ko":{"Clubs":"클럽","Diamonds":"다이아몬드","Hearts":"하트","Spades":"스페이드"},"nl":{"Clubs":"Klaveren","Diamonds":"Ruiten","Hearts":"Harten","Spades":"Schoppen"},"pl":{"Clubs":"Trefle","Diamonds":"Karo","Hearts":"Kiery","Spades":"Piki"},"pt_BR":{"Clubs":"Paus","Diamonds":"Ouros","Hearts":"Copas","Spades":"Espadas"},"ru":{"Clubs":"Трефы","Diamonds":"Бубны","Hearts":"Черви","Spades":"Пики"},"zh_CN":{"Clubs":"梅花","Diamonds":"方片","Hearts":"红桃","Spades":"黑桃"},"zh_TW":{"Clubs":"梅花","Diamonds":"方塊","Hearts":"紅心","Spades":"黑桃"}};
/** 一张扑克牌的名字：<花色><点数>（按当前语言；没有该语言的花色表就退回英文） */
function pcName (item, lang) {
  const L = lang || S.lang;
  const t = PC_SUITS[L] || PC_SUITS['en-us'];
  const suit = item.suit || 'Spades';
  const rank = String(item.value == null ? '' : item.value);
  if (L === 'en-us') return rank + ' of ' + (t[suit] || suit);
  return (t[suit] || suit) + rank;      /* 中文/日文/韩文都是"花色在前" */
}
/* 花色的各语言名字 —— 直接从游戏本地化文件的 suits_plural 里读出来（由 patch-cards.js 生成），
   所以 52 张扑克牌的名字是"红桃A / 方片10 / 黑桃K"这种，和游戏里一致。 */
const SUIT_SYM = { S: '♠', H: '♥', D: '♦', C: '♣' };
const EDITION_NUM = { e_foil: { chips: 50 }, e_holo: { mult: 10 }, e_polychrome: { xmult: 1.5 } };

const SC = {
  hand: 'Pair', level: 1,
  played: [], held: [], jokers: [], blind: '',
  /* 局面：原版算分读到的所有外部状态（.work/gen-state.js 从源码里扫出来的字段）
     —— G.GAME.dollars / current_round.* / #G.deck.cards / consumeable_usage_total …
     以及每个牌型打过几次（G.GAME.hands[x].played，Obelisk、To Do List 这类要看它） */
  env: {
    dollars: 5, handsLeft: 4, discardsLeft: 3,
    handsPlayed: 0, discardsUsed: 0,
    roundHands: 4, roundDiscards: 3,
    deckCards: 44, deckSize: 52, handCards: 8,
    jokerSlots: 5, consumeableSlots: 2,
    tarotUsed: 0, planetUsed: 0, spectralUsed: 0,
    ante: 1, round: 1, consumeablesUsed: 0,
    bossBlind: false, blindDisabled: false,
    played: {},                     /* 牌型名 → 本局打过几次 */
  },
  manual: { chips: 0, mult: 0, xmult: 1 },
};
const scCard = (rank, suit, enh, ed, seal) => ({ rank: rank || '10', suit: suit || 'S', enh: enh || '', ed: ed || '', seal: seal || '' });

/** 强化牌提供的数值，直接读图鉴里的 config（bonus/mult/glass/steel/stone） */
function enhValues (id) {
  const it = BY_ID[id];
  const c = (it && it.config) || {};
  const ex = (it && it.extra) || c.extra || {};
  const n = (v) => (typeof v === 'number' ? v : (v && typeof v === 'object' ? 0 : Number(v) || 0));
  return {
    chips: n(c.chips) + (id === 'm_bonus' ? 30 : id === 'm_stone' ? 50 : 0),
    mult: n(c.mult) + (id === 'm_mult' ? 4 : 0),
    xmult: id === 'm_glass' ? 2 : 0,
    h_xmult: id === 'm_steel' ? 1.5 : 0,
    name: (it && it.name) || id,
    extra: ex,
  };
}

/** 局面里的某个外部状态 → 数字（原版源码里长什么样，这里就认什么样） */
/* 这些在原版里是"表"，写在条件里就是判存在（G.GAME.consumeable_usage_total and …），
   所以替换成 true/false，而不是数字 */
const SC_TABLE_PATHS = /^(G\.GAME\.consumeable_usage_total|G\.GAME\.hands|G\.GAME\.blind|G\.GAME\.current_round|G\.GAME\.round_resets|G\.jokers|G\.hand|G\.deck|G\.discard|G\.consumeables|G\.playing_cards|G\.GAME)$/;
function scStateNum (path, j) {
  const e = SC.env;
  /* 玩家在这张牌的弹窗里选的值优先（花色是字符串，用来判 is_suit） */
  if (j && j.params && j.params[path] !== undefined && j.params[path] !== '') return j.params[path];
  const p = path.replace(/^#\s*/, '').trim();
  if (SC_TABLE_PATHS.test(p)) return true;
  if (/^G\.deck\.cards$/.test(p)) return e.deckCards;
  if (/^G\.playing_cards$/.test(p)) return e.deckCards + e.handCards + SC.played.length;   /* 还在牌组里的全部牌 */
  if (/^G\.hand\.cards$/.test(p)) return e.handCards;
  if (/^G\.jokers\.cards$/.test(p)) return SC.jokers.length;
  if (/^G\.jokers\.config\.card_limit$/.test(p)) return e.jokerSlots;
  if (/^G\.consumeables\.cards$/.test(p)) return SC.usedConsumables ? 0 : (e.consumeablesUsed || 0);
  if (/^G\.GAME\.starting_deck_size$/.test(p)) return e.deckSize;
  if (/^G\.GAME\.dollars$/.test(p)) return e.dollars;
  if (/^G\.GAME\.current_round\.hands_left$/.test(p)) return e.handsLeft;
  if (/^G\.GAME\.current_round\.discards_left$/.test(p)) return e.discardsLeft;
  if (/^G\.GAME\.current_round\.hands_played$/.test(p)) return e.handsPlayed;
  if (/^G\.GAME\.current_round\.discards_used$/.test(p)) return e.discardsUsed;
  if (/^G\.GAME\.round_resets\.hands$/.test(p)) return e.roundHands;
  if (/^G\.GAME\.round_resets\.discards$/.test(p)) return e.roundDiscards;
  if (/^G\.GAME\.consumeable_usage_total\.tarot$/.test(p)) return e.tarotUsed;
  if (/^G\.GAME\.consumeable_usage_total\.planet$/.test(p)) return e.planetUsed;
  if (/^G\.GAME\.consumeable_usage_total\.spectral$/.test(p)) return e.spectralUsed;
  const m = /^G\.GAME\.hands\[['"]([^'"]+)['"]\]\.played$/.exec(p);
  if (m) return handPlayCount(m[1]);
  return null;
}

/** 某个牌型本局打过几次（G.GAME.hands[x].played） */
function handPlayCount (name) {
  return (SC.env.played && SC.env.played[name]) || 0;
}

/** 把表达式里的外部状态替换成数字；认不出来的返回 null（调用方会标"需要手填"） */
function substState (expr, j) {
  let unknown = false;
  const s = String(expr).replace(/(#\s*)?(G\.GAME(?:\.[A-Za-z_][\w]*|\[[^\]]+\])*|G\.(?:deck|playing_cards|hand|jokers|consumeables)(?:\.[A-Za-z_][\w]*)*)/g, (all) => {
    const v = scStateNum(all, j);
    if (v === true) return 'true';
    if (v === false) return 'false';
    if (v == null) { unknown = true; return '0' }
    return String(v);
  });
  return unknown ? null : s;
}

/** 把规则里的表达式求值：外部局面（G.GAME.* / #G.deck.cards …）先换成数字，
 *  self.ability.X 再从小丑牌自己的记录值（j.state）与配置（j.cfg）里取。
 *  记录值是「每用一张塔罗牌 +1 倍率」这类累计量，用户可以手填。 */
function evalExpr (expr, jOrCfg, growth) {
  if (expr === undefined || expr === null) return null;
  const j = (jOrCfg && jOrCfg.cfg) ? jOrCfg : { cfg: jOrCfg || {}, state: (growth ? { mult: growth } : {}) };
  const st = substState(expr, j);
  if (st == null) return null;
  const s = st.replace(/self\.ability\./g, '').replace(/\btemp_Mult\b/g, '0');
  const get = (path) => {
    /* ① 玩家填的记录值优先（self.ability.mult / x_mult / extra.chips …） */
    if (j.state && Object.prototype.hasOwnProperty.call(j.state, path) && typeof j.state[path] === 'number') return j.state[path];
    /* ② 其次才是这张牌的静态配置（+4 倍率那种） */
    const p = path.split('.');
    let v = j.cfg;
    for (const k of p) { if (v == null || typeof v !== 'object') return undefined; v = v[k] }
    if (typeof v === 'number') return v;
    /* ③ 没填过的可变字段按 0 起算（原版新建时也是 0） */
    if (MUTABLE_FIELDS.has(path)) return 0;
    return v;
  };
  const tokens = s.match(/[A-Za-z_][A-Za-z0-9_.]*|\d+(?:\.\d+)?|[-+*/()]/g);
  if (!tokens) return null;
  let ok = true;
  const js = tokens.map((t) => {
    if (/^[-+*/()]$/.test(t) || /^\d/.test(t)) return t;
    const v = get(t);
    if (typeof v !== 'number') { ok = false; return '0' }
    return String(v);
  }).join('');
  if (!ok) return null;
  try {
    const v = Function('"use strict";return (' + js + ')')();   // 只由数字与运算符拼成
    return typeof v === 'number' && isFinite(v) ? v : null;
  } catch (e) { return null; }
}

/** 逐牌规则的条件判定：支持 is_suit / get_id 的常见写法 */
const RANK_NAMES = { 14: 'A', 13: 'K', 12: 'Q', 11: 'J' };
/** 剥掉包住整条表达式的外层括号，只剥成对的那一层。
 *  原来的写法是 a.trim().replace(/^\(+|\)+$/g, '')：它会把末尾所有右括号无条件吃掉，
 *  于是 is_face() 变成 is_face(、is_suit(x) 变成 is_suit(x，所有按牌判定的分支都匹配不上。
 *  这就是古老小丑以及 Scholar / Fibonacci / Scary Face 等全部逐牌规则一直没生效的根因。 */
function scStripWrap (s) {
  let t = String(s == null ? '' : s).trim();
  for (;;) {
    if (t.length < 2 || t.charAt(0) !== '(' || t.charAt(t.length - 1) !== ')') return t;
    let depth = 0;
    let ok = true;
    for (let i = 0; i < t.length; i++) {
      const ch = t.charAt(i);
      if (ch === '(') depth++;
      else if (ch === ')') { depth--; if (depth === 0 && i < t.length - 1) { ok = false; break } }
    }
    if (!ok || depth !== 0) return t;
    t = t.slice(1, -1).trim();
  }
}
function condMatchesCard (cond, card, j) {
  cond = scSubstParams(cond, j);   /* 先把它读的动态值换成玩家选的花色/点数 */
  const id = RANK_ID[card.rank];
  const face = id >= 11 && id <= 13;
  let c = cond.replace(/^\s*and\s*/, '');
  if (!c) return true;
  /* 全是 or/and 的组合，逐项判断 */
  const parts = c.split(/\s+or\s+/);
  for (const part of parts) {
    const ands = part.split(/\s+and\s+/);
    let all = true;
    for (const a of ands) {
      const t = scStripWrap(a);   /* 旧写法会无条件吃掉末尾的右括号，见 scStripWrap 的注释 */
      if (!t) continue;
      if (/not context\./.test(t) || /pseudorandom|blueprint|lucky_trigger|G\.GAME/.test(t)) { all = false; break }
      let m;
      if ((m = /is_suit\(\s*"(\w+)"\s*\)/.exec(t))) { if (SUIT_EN[card.suit] !== m[1]) { all = false; break } continue }
      if (/is_face\(\)/.test(t)) { if (!face) { all = false; break } continue }
      if ((m = /get_id\(\)\s*==\s*(\d+)/.exec(t))) { if (id !== +m[1]) { all = false; break } continue }
      if ((m = /get_id\(\)\s*<=\s*(\d+)/.exec(t))) { if (id > +m[1]) { all = false; break } continue }
      if ((m = /get_id\(\)\s*>=\s*(\d+)/.exec(t))) { if (id < +m[1]) { all = false; break } continue }
      if (/get_id\(\)\s*%\s*2\s*==\s*0/.test(t)) { if (id % 2 !== 0) { all = false; break } continue }
      if (/get_id\(\)\s*%\s*2\s*==\s*1/.test(t)) { if (id % 2 !== 1) { all = false; break } continue }
      all = false; break          // 有看不懂的条件 → 这条按不匹配处理，并在账目里标注
    }
    if (all) return true;
  }
  return false;
}

/** 小丑牌自己的记录值（self.ability.mult / x_mult / extra.chips …）→ 数字 */
function jokerStateNum (j, path) {
  const key = String(path).replace(/^self\.ability\./, '').replace(/^ability\./, '');
  if (j && j.state && typeof j.state[key] === 'number') return j.state[key];
  let v = j && j.cfg;
  for (const k of key.split('.')) { if (v == null || typeof v !== 'object') { v = undefined; break } v = v[k] }
  if (typeof v === 'number') return v;
  if (MUTABLE_FIELDS.has(key)) return 0;      /* 原版新建时也是 0 */
  return null;
}

/** 主结算（joker_main）条件的判定：把原版的条件表达式尽量真求值。
 *  做法是把 Lua 的条件逐项换成 JS：外部局面 → 数字、self.ability.X → 这张牌的记录值、
 *  next(context.poker_hands['X']) → 当前牌型、#context.full_hand → 打出的张数。
 *  剩下认不出来的（伪随机、context.other_joker、牌堆里还剩什么牌…）返回 null，
 *  界面会把它列进"没自动算"，而不是假装算过了。 */
function condMatchesHand (cond, j, playedCount) {
  let c = scSubstParams(cond, j).replace(/^\s*and\s+/, '').trim();
  if (!c) return true;
  if (/^not context\.blueprint$/.test(c)) return true;
  if (/pseudorandom|context\.other_joker|context\.other_card|context\.destroying_card|G\.GAME\.blind\b/.test(c)) return null;
  const solo = /^next\(\s*context\.poker_hands\[['"]([^'"]+)['"]\]\s*\)$/.exec(c);
  if (solo) return SC.hand === solo[1];
  c = c
    .replace(/next\(\s*context\.poker_hands\[['"]([^'"]+)['"]\]\s*\)/g, (m, h) => (SC.hand === h ? 'true' : 'false'))
    .replace(/#?\s*context\.full_hand/g, String(playedCount))
    .replace(/self\.ability\.extra\.size/g, '5')
    .replace(/self\.ability\.[A-Za-z_][\w.]*/g, (m) => { const v = jokerStateNum(j, m); return v == null ? '__UNK__' : String(v) })
    .replace(/G\.GAME\.blind\.boss/g, SC.env.bossBlind ? 'true' : 'false')
    .replace(/G\.GAME\.blind\.disabled/g, SC.env.blindDisabled ? 'true' : 'false');
  const st = substState(c, j);
  if (st == null) return null;
  const js = st
    .replace(/\band\b/g, '&&').replace(/\bor\b/g, '||').replace(/\bnot\b/g, '!')
    .replace(/~=/g, '!==').replace(/([^=!<>])==([^=])/g, '$1===$2');
  if (js.includes('__UNK__')) return null;
  if (/[A-Za-z_]{2,}/.test(js.replace(/true|false|&&|\|\||!/g, ''))) return null;   /* 还有认不出的标识符 */
  try {
    const v = Function('"use strict";return (' + js + ')')();
    return typeof v === 'boolean' ? v : null;
  } catch (e) { return null }
}

/* ================================================================ BOSS 盲注
 * 原版里「影响这一手怎么算」的盲注效果分两类：
 *  ① 声明式的削弱规则（blind.lua:625-645 与 debuff_hand）：`debuff = { suit=… }` /
 *     `{ is_face='face' }` / `{ value=… }` / `{ nominal=… }`，以及 `{ hand=… }` / `{ h_size_ge=… }` /
 *     `{ h_size_le=… }`。我们照源码写成通用判定 —— mod 的盲注只要按同一格式声明 debuff，
 *     就自动生效，不需要为每个 mod 单独适配。
 *  ② 写在代码里的那几个（The Arm 降等级 / The Flint 数值减半 / Verdant Leaf 全削弱 /
 *     Crimson Heart 禁小丑）：按盲注 key 列一张小表；mod 想接自己的盲注，往
 *     `B.score.blindRules['bl_xxx']` 塞一条即可（见 DEVELOPMENT.md）。
 * 被削弱的牌整张跳过（state_events.lua:655）—— 不算筹码/倍率，强化·版本·蜡封也不触发。 */
const SC_BLIND_RULES = {
  bl_arm: { handLevel: -1, note: '打出的牌型等级 −1（本手按降级后的数值结算）' },
  bl_flint: { halfBase: true, note: '本手的基础筹码与倍率减半' },
  bl_final_leaf: { debuffAll: true, note: '所有牌都被削弱（卖掉一张小丑牌之前）' },
  bl_final_heart: { note: '每手随机禁用一张小丑牌 —— 在小丑牌弹窗里勾「被禁用」' },
  bl_final_acorn: { note: '会打乱小丑牌顺序（顺序可以直接拖）' },
  bl_final_bell: { note: '总有一张牌处于选中状态（不影响算分）' },
  bl_psychic: { needCards: 5, note: '必须打出 5 张牌' },
  bl_eye: { note: '本回合不能重复打出同一种牌型' },
  bl_mouth: { note: '本回合只能打出一种牌型' },
  bl_needle: { env: { handsLeft: 1 }, note: '本回合只有 1 次出牌' },
  bl_water: { env: { discardsLeft: 0 }, note: '本回合没有弃牌次数' },
  bl_hook: { env: { discardsLeft: 2 }, note: '每打一手弃 2 张牌' },
  bl_wall: { note: '只是盲注需求更大（不影响这一手的分）' },
  bl_final_vessel: { note: '只是盲注需求更大' },
  bl_ox: { note: '只影响金钱' }, bl_tooth: { note: '只影响金钱' },
  bl_house: { note: '只影响起手发牌（面朝下）' }, bl_fish: { note: '只影响抽牌（面朝下）' },
  bl_wheel: { note: '只影响抽牌（面朝下）' }, bl_serpent: { note: '只影响抽牌与弃牌' },
  bl_manacle: { note: '只影响手牌上限' }, bl_mark: { note: '只影响起手发牌（面朝下）' },
};
/* 控制台 / mod 都能往这里加：B.score.blindRules['bl_myboss'] = { halfBase: true, note: '…' } */
const SC_BLIND_RULES_EXTRA = {};
function scBlindItem () {
  if (!SC.blind) return null;
  /* BY_ID 是加载时建好的索引；运行期新加的条目（比如刚导入的 mod）可能还没进去，回退搜一遍 */
  return BY_ID[SC.blind] || ITEMS.find((i) => i.id === SC.blind) || null;
}
function scBlindRule (it) {
  if (!it) return null;
  const key = it.key || it.id || '';
  return SC_BLIND_RULES_EXTRA[key] || SC_BLIND_RULES[key] || null;
}
function scSuitName (en) {
  const m = D.loc && D.loc[S.lang] && D.loc[S.lang].misc;
  return (m && m.suits_plural && m.suits_plural[en]) || en;
}
/** 声明式削弱：与 blind.lua:625-645 一一对应（mod 的盲注同样走这里） */
function scSpecDebuffs (card, spec) {
  if (!spec) return false;
  if (spec.all) return true;
  if (spec.suit && SUIT_EN[card.suit] === spec.suit) return true;
  if (spec.is_face === 'face' && ['J', 'Q', 'K'].indexOf(card.rank) >= 0) return true;
  if (spec.value && String(spec.value) === String(card.rank)) return true;
  if (spec.nominal && String(spec.nominal) === String(RANK_ID[card.rank])) return true;
  return false;
}
/** 这张牌现在算不算被削弱（手动勾的 + 盲注自动判定的） */
function scCardDebuffed (card) {
  if (card.debuff) return true;
  const it = scBlindItem();
  if (!it) return false;
  const rule = scBlindRule(it);
  if (rule && rule.debuffAll) return true;
  return !!(it.raw && it.raw.debuff && scSpecDebuffs(card, it.raw.debuff));
}
/** 这个盲注会不会影响这一手的分（列表里给个标签，用户一眼知道该不该管它）
 *  返回 true=影响算分 / 'play'=只影响能不能这样出牌 / false=不影响 */
function scBlindImpact (it) {
  const rule = scBlindRule(it);
  const spec = (it.raw && it.raw.debuff) || {};
  if (rule && (rule.handLevel || rule.halfBase || rule.debuffAll)) return true;
  if (spec.all || spec.suit || spec.is_face || spec.value || spec.nominal) return true;
  if (spec.h_size_ge || spec.h_size_le || spec.hand) return 'play';
  return false;
}
/** 盲注贴图的小图（blind_chips 是 34×34 的格子、x 是帧号，取第 0 帧） */
function scBlindArt (it, px) {
  if (!it || !it.pos) return null;
  const atlasName = (it.source && it.atlas && it.atlas !== 'blind_chips') ? it.atlas : 'blind_chips';
  if (!D.atlases[atlasName]) return null;
  let src = null;
  try { src = compose({ standalone: { atlas: atlasName, pos: { x: 0, y: it.pos.y } } }, 2, 0) } catch (e) { return null }
  if (!src || !src.width) return null;
  const size = px || 34;
  const cv = newCanvas(size, size);
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const r = Math.min(size / src.width, size / src.height);
  const w = src.width * r, h = src.height * r;
  ctx.drawImage(src, (size - w) / 2, (size - h) / 2, w, h);
  return cv;
}
/** 列表/大块里的贴图占位：滚到才画（29 个盲注一次性 compose 没必要） */
function scPaintBlindArt (holder, item, px) {
  if (!holder || holder.__painted) return;
  holder.__painted = true;
  const cv = scBlindArt(item, px);
  if (!cv) { holder.classList.add('noart'); return }
  holder.innerHTML = '';
  holder.appendChild(cv);
}
/** 两句话是不是一个意思（够用的近似：汉字集合重合度 ≥ 0.7 就算） */
function scSameMeaning (a, b) {
  const set = (t) => new Set(String(t || '').replace(/[^\u4e00-\u9fa5]/g, '').split(''));
  const A = set(a), B = set(b);
  if (!A.size || !B.size) return false;
  let hit = 0;
  for (const ch of B) if (A.has(ch)) hit++;
  return hit / B.size >= 0.7;
}
/** 盲注的效果文本（不依赖当前选择：列表里每一行也要用它） */
function scBlindEffectText (it) {
  if (!it) return '';
  const rule = scBlindRule(it);
  const spec = (it.raw && it.raw.debuff) || {};
  const desc = ((it.text && (it.text[S.lang] || it.text['en-us'])) || []).join(' ');
  const bits = [];
  if (desc) bits.push(desc);
  if (!desc && spec.suit) bits.push('所有' + scSuitName(spec.suit) + '牌被削弱');
  if (!desc && spec.is_face === 'face') bits.push('所有人头牌（J/Q/K）被削弱');
  if (!desc && spec.value) bits.push('点数 ' + spec.value + ' 的牌被削弱');
  if (!desc && spec.nominal) bits.push('点数 ' + spec.nominal + ' 的牌被削弱');
  if (spec.h_size_ge) bits.push('必须打出至少 ' + spec.h_size_ge + ' 张牌');
  if (spec.h_size_le) bits.push('最多打出 ' + spec.h_size_le + ' 张牌');
  /* 注解与游戏描述常常是同一句话：汉字重合度高的就不重复说了 */
  if (rule && rule.note && !scSameMeaning(desc, rule.note)) bits.push(rule.note);
  if (!rule && !Object.keys(spec).length) bits.push('本页不认识它的效果（多半来自 mod）—— 用卡牌的「被削弱」和小丑牌的「被禁用」手动补');
  return bits.join('　·　');
}
/** 当前盲注那一块：名字大、效果直接写出来（不用先选了才知道） */
function scBlindBoxHtml () {
  const it = scBlindItem();
  const auto = SC.played.filter((c) => scCardDebuffed(c)).length;
  if (!it) {
    return '<div class="scblindcur none"><span class="scblindart none">—</span><div class="scblindrowmain"><div class="scblindname">不算盲注</div>' +
      '<div class="scblindfx">这一手按普通回合算。点「选择盲注」挑一个 BOSS，它的效果（谁被削弱、等级变化…）会自动算进去。</div></div>' +
      '<button class="btn primary scblindpick" type="button">选择盲注</button></div>';
  }
  const impact = scBlindImpact(it);
  const tag = impact === true ? '<i class="scblindtag score">影响算分</i>'
    : (impact === 'play' ? '<i class="scblindtag play">影响出牌</i>' : '<i class="scblindtag none">不影响算分</i>');
  return '<div class="scblindcur"><span class="scblindart" data-art="' + it.id + '"></span>' +
    '<div class="scblindrowmain"><div class="scblindname">' + esc(nm(it)) + (it.source ? ' <i class="mod">MOD</i>' : '') + tag + '</div>' +
    '<div class="scblindfx">' + scBlindEffectText(it) + (auto ? '<span class="scblinda">这手里 ' + auto + ' 张牌被削弱</span>' : '') + '</div></div>' +
    '<button class="btn scblindpick" type="button">换一个</button>' +
    '<button class="btn scblindclear" type="button">取消</button></div>';
}
/** 选择弹窗：一行一个盲注，名字与效果都写出来（列表来自图鉴条目，mod 的盲注自动在里面） */
function scBlindPicker () {
  const old = document.getElementById('scBlindPick');
  if (old) old.remove();
  const root = document.createElement('div');
  root.id = 'scBlindPick'; root.className = 'scpick scmodal';
  const list = ITEMS.filter((i) => i.cat === 'Blind' && i.raw && i.raw.boss);
  root.innerHTML = '<div class="scpickpanel"><div class="scpicktop"><b>选择 BOSS 盲注</b>' +
    '<span class="dim">' + list.length + ' 个（含 mod）· 每行都写了它在这一手里做什么</span>' +
    '<input id="scBlindQ" placeholder="搜索名字或效果…" autocomplete="off">' +
    '<button class="btn" id="scBlindDone" type="button">关闭</button></div>' +
    '<div class="scpanelscroll scblindlist" id="scBlindList"></div></div>';
  document.body.appendChild(root);
  const q = (s) => root.querySelector(s);
  const rowHtml = (it) => {
    if (!it) return '<button class="scblindrow none" data-blind=""><span class="scblindart none">—</span>' +
      '<span class="scblindtext"><b>不算盲注</b><span class="fx">这一手按普通回合算</span></span></button>';
    const cur = SC.blind === it.id ? ' on' : '';
    const impact = scBlindImpact(it);
    const tag = impact === true ? '<i class="scblindtag score">影响算分</i>'
      : (impact === 'play' ? '<i class="scblindtag play">影响出牌</i>' : '<i class="scblindtag none">不影响算分</i>');
    return '<button class="scblindrow' + cur + '" data-blind="' + it.id + '">' +
      '<span class="scblindart" data-art="' + it.id + '"></span>' +
      '<span class="scblindtext"><b>' + esc(nm(it)) + (it.source ? ' <i class="mod">MOD</i>' : '') +
      (cur ? ' <i class="cur">当前</i>' : '') + '</b>' +
      '<span class="fx">' + scBlindEffectText(it) + '</span></span>' + tag + '</button>';
  };
  const paint = (query) => {
    const s = (query || '').toLowerCase();
    const hit = list.filter((i) => !s || (nm(i) + ' ' + scBlindEffectText(i) + ' ' + i.id).toLowerCase().includes(s));
    q('#scBlindList').innerHTML = rowHtml(null) + (hit.length ? hit.map(rowHtml).join('')
      : '<div class="hint" style="padding:14px">没有匹配的盲注</div>');
    /* 贴图滚到才画（IntersectionObserver 有 300px 提前量） */
    for (const el of q('#scBlindList').querySelectorAll('[data-art]')) {
      const id = el.dataset.art;
      const it2 = list.filter((x) => x.id === id)[0];
      if (!it2) continue;
      el.__paintBlind = () => scPaintBlindArt(el, it2, 34);
      if (IO) { el._paint = el.__paintBlind; IO.observe(el) } else el.__paintBlind();
    }
  };
  paint('');
  q('#scBlindQ').oninput = (e) => paint(e.target.value);
  q('#scBlindDone').onclick = () => root.remove();
  root.onclick = (e) => {
    if (e.target === root) { root.remove(); return }
    const row = e.target.closest('[data-blind]');
    if (!row) return;
    root.remove();
    scStopPlay(); SC.blind = row.dataset.blind || ''; SC_UI.step = -1; render();
  };
  document.addEventListener('keydown', function esc (e) {
    if (e.key !== 'Escape') return;
    document.removeEventListener('keydown', esc);
    root.remove();
  });
}
/** 盲注下拉：列表直接来自图鉴条目，所以 mod 的盲注自动在里面 */
function scBlindOptions () {
  const list = ITEMS.filter((i) => i.cat === 'Blind' && i.raw && i.raw.boss);
  return '<option value="">（不算盲注）</option>' + list.map((b) =>
    '<option value="' + b.id + '"' + (SC.blind === b.id ? ' selected' : '') + '>' + esc(nm(b)) + (b.source ? ' · MOD' : '') + '</option>').join('');
}
/** 盲注说明：它自己的本地化描述 + 我们的注解 + 自动削弱了几张 + 认不出来时明说 */
function scBlindNoteHtml () {
  const it = scBlindItem();
  if (!it) return '没选盲注：这一手按普通回合算。';
  const rule = scBlindRule(it);
  const spec = (it.raw && it.raw.debuff) || {};
  const desc = ((it.text && (it.text[S.lang] || it.text['en-us'])) || []).join(' ');
  const bits = [];
  if (desc) bits.push(desc);
  /* 游戏自己的描述已经写了就不重复（例如 The Club 的「所有梅花牌都被削弱」） */
  if (!desc && spec.suit) bits.push('所有' + scSuitName(spec.suit) + '牌被削弱');
  if (!desc && spec.is_face === 'face') bits.push('所有人头牌（J/Q/K）被削弱');
  if (!desc && spec.value) bits.push('点数 ' + spec.value + ' 的牌被削弱');
  if (!desc && spec.nominal) bits.push('点数 ' + spec.nominal + ' 的牌被削弱');
  if (spec.h_size_ge) bits.push('必须打出至少 ' + spec.h_size_ge + ' 张牌');
  if (spec.h_size_le) bits.push('最多打出 ' + spec.h_size_le + ' 张牌');
  if (rule && rule.note) bits.push(rule.note);
  const auto = SC.played.filter((c) => scCardDebuffed(c)).length;
  if (auto) bits.push('<b>这手里有 ' + auto + ' 张牌被削弱、不参与算分</b>');
  if (!rule && !Object.keys(spec).length) bits.push('这个盲注的效果本页不认识（多半来自 mod）—— 用卡牌弹窗里的「被削弱」和小丑牌弹窗里的「被禁用」手动补，也可以在控制台往 score.blindRules 里加一条');
  return bits.join('　·　');
}

function scoreCompute () {
  const rows = [];
  const warns = [];
  const hand = D.hands.find((h) => h.name === SC.hand) || D.hands[0];
  const lvl0 = Math.max(1, Math.min(99, SC.level | 0));
  const blindIt = scBlindItem();
  const bRule = blindIt ? scBlindRule(blindIt) : null;
  /* 「BOSS 盲注」这个局面开关以前要手勾，现在由盲注选择推导：
     选了盲注 = 这一手就是 BOSS 盲注（依赖 G.GAME.blind.boss 的牌才判得对） */
  SC.env.bossBlind = !!(blindIt && blindIt.raw && blindIt.raw.boss);
  /* The Arm：本手按降级后的等级结算 */
  const lvl = (bRule && bRule.handLevel) ? Math.max(1, lvl0 + bRule.handLevel) : lvl0;
  /* 每级加多少：游戏数据里字段名是 l_chips / l_mult（hand.chipsPerLevel 根本不存在，
     所以以前不管把等级调到几，筹码和倍率都不变 —— 这就是用户报的"改等级没作用"）。 */
  let chips = hand.chips + (lvl - 1) * (hand.l_chips || 0);
  let mult = hand.mult + (lvl - 1) * (hand.l_mult || 0);
  rows.push({ label: `牌型「${hand.name}」Lv.${lvl}`, chips, mult, op: 'base', ref: { kind: 'hand' } });
  if (blindIt) {
    rows.push({ label: `BOSS 盲注「${blindIt.name}」` + (bRule && bRule.note ? '：' + bRule.note : ''), chips, mult, op: 'blind', ref: { kind: 'blind' } });
    if (bRule && bRule.halfBase) {   /* The Flint：blind.lua:511-514，先减半再进逐牌 / 小丑 */
      chips = Math.max(0, Math.floor(chips * 0.5 + 0.5));
      mult = Math.max(1, Math.floor(mult * 0.5 + 0.5));
      rows.push({ label: 'The Flint：基础筹码与倍率减半', chips, mult, op: 'x', ref: { kind: 'blind' } });
    }
  }

  const playedCount = SC.played.length;
  let isManual = false;
  const pending = [];
  scUpdateJokers();   /* 原版 update 里先算好的值（Joker Stencil、Blackboard…） */
  scApplyAutoParams();  /* 没手填的话，用局面里的值把这张牌读的动态值补上 */
  /* ② 每张打出的牌（每一行都带 ref，界面据此高亮对应的那张卡图） */
  for (let ci = 0; ci < SC.played.length; ci++) {
    const c = SC.played[ci];
    const cref = { kind: 'played', i: ci };
    if (scCardDebuffed(c)) {
      /* state_events.lua:655：被削弱的牌整张跳过 */
      rows.push({ label: `${c.rank}${SUIT_SYM[c.suit]} 被削弱 → 不参与算分`, chips, mult, op: 'debuff', ref: cref });
      continue;
    }
    let reps = 1;
    if (c.seal === 'Red') reps += 1;
    for (let ji = 0; ji < SC.jokers.length; ji++) {
      const j = SC.jokers[ji];
      if (j.debuff) continue;   /* 被禁用的小丑牌不参与（也不复制） */
      const rule = jokerRule(j);
      if (rule && rule.k === 'repeat' && condMatchesCard(rule.c || '', c)) {
        const n = evalExpr(rule.reps, j);
        if (n) { reps += n; rows.push({ label: `${j.name}：这张牌再算 ${n} 次`, chips, mult, op: 'note', ref: { kind: 'joker', i: ji } }) }
      }
    }
    for (let r = 0; r < reps; r++) {
      const base = RANK_CHIPS[c.rank] || 0;
      const ev = c.enh ? enhValues(c.enh) : null;
      const addChips = base + (ev ? ev.chips : 0);
      const addMult = ev ? ev.mult : 0;
      const xm = ev ? ev.xmult : 0;
      chips += addChips;
      rows.push({
        label: `${c.rank}${SUIT_SYM[c.suit]}${c.enh ? ' · ' + ev.name : ''}${reps > 1 ? '（第 ' + (r + 1) + ' 次）' : ''}`,
        chips, mult, op: 'card', ref: cref,
      });
      if (addMult) { mult += addMult }
      if (xm) { mult *= xm; rows.push({ label: `  ${ev.name} ×${xm}`, chips, mult, op: 'x', ref: cref }) }
      /* 逐牌小丑：花色小丑（通用配置）与具名规则都算在这张牌上 */
      for (let ji = 0; ji < SC.jokers.length; ji++) {
        const j = SC.jokers[ji];
        const cfg = j.cfg || {};
        if (!j.debuff && cfg.effect === 'Suit Mult' && cfg.extra && SUIT_EN[c.suit] === cfg.extra.suit) {
          const add = Number(cfg.extra.s_mult) || 0;
          if (add) { mult += add; rows.push({ label: `${j.name} +${add} 倍率（${SUIT_SYM[c.suit]}）`, chips, mult, op: 'joker', ref: { kind: 'joker', i: ji } }) }
        }
        const rule = jokerRule(j);
        if (!rule || !scPerCardRule(rule)) continue;
        if (!condMatchesCard(rule.c, c, j)) continue;
        applyRule(rule, j, rows, () => ({ chips, mult }), (v) => { chips = v.chips; mult = v.mult }, { kind: 'joker', i: ji })
      }
      const ed = EDITION_NUM[c.ed];
      if (ed) {
        if (ed.chips) chips += ed.chips;
        if (ed.mult) mult += ed.mult;
        if (ed.xmult) mult *= ed.xmult;
        rows.push({ label: `版本 ${ed.chips ? '+' + ed.chips + ' 筹码' : ed.mult ? '+' + ed.mult + ' 倍率' : '×' + ed.xmult + ' 倍率'}`, chips, mult, op: 'ed', ref: cref });
      }
    }
  }

  /* ③ 留在手里的牌 */
  for (let hi = 0; hi < SC.held.length; hi++) {
    const c = SC.held[hi];
    const ev = c.enh ? enhValues(c.enh) : null;
    if (ev && ev.h_xmult) {
      mult *= ev.h_xmult;
      rows.push({ label: `手中 ${c.rank}${SUIT_SYM[c.suit]}（${ev.name}）×${ev.h_xmult}`, chips, mult, op: 'x', ref: { kind: 'held', i: hi } });
    }
  }

  /* ④ 小丑主结算（按位置从左到右） */
  for (let ji = 0; ji < SC.jokers.length; ji++) {
    const j = SC.jokers[ji];
    const jref = { kind: 'joker', i: ji };
    if (j.debuff) { rows.push({ label: `${scJokerName(j)} 被禁用 → 不参与算分`, chips, mult, op: 'debuff', ref: jref }); continue }
    /* Blueprint 复制它右边那张、Brainstorm 复制最左边那张（card.lua:4225-4239） */
    let src = j;
    if (j.name === 'Blueprint' && SC.jokers[ji + 1]) src = SC.jokers[ji + 1];
    else if (j.name === 'Brainstorm' && SC.jokers[0] && SC.jokers[0] !== j) src = SC.jokers[0];
    const copied = src !== j;
    const tag = copied ? scJokerName(j) + ' → ' + scJokerName(src) : scJokerName(j);
    const rule = jokerRule(src);
    const ed = EDITION_NUM[j.ed];
    if (ed && ed.chips) { chips += ed.chips; rows.push({ label: `${j.name} 版本 +${ed.chips} 筹码`, chips, mult, op: 'ed', ref: jref }) }
    if (ed && ed.mult) { mult += ed.mult; rows.push({ label: `${j.name} 版本 +${ed.mult} 倍率`, chips, mult, op: 'ed', ref: jref }) }
    /* 多彩版本的 ×1.5 以前在小丑这一支里漏掉了（逐牌那一支有 ×1.5）—— 补上 */
    if (ed && ed.xmult) { mult *= ed.xmult; rows.push({ label: `${j.name} 版本 ×${ed.xmult} 倍率`, chips, mult, op: 'x', ref: jref }) }
    const cfg = src.cfg, type = cfg.type;
    const typeOk = !type || SC.hand === type;
    if (cfg.x_mult > 1 && typeOk) { mult *= cfg.x_mult; rows.push({ label: `${tag} ×${cfg.x_mult} 倍率`, chips, mult, op: 'x', ref: jref }) }
    if (cfg.t_mult > 0 && typeOk) { mult += cfg.t_mult; rows.push({ label: `${tag} +${cfg.t_mult} 倍率`, chips, mult, op: 'joker', ref: jref }) }
    if (cfg.t_chips > 0 && typeOk) { chips += cfg.t_chips; rows.push({ label: `${tag} +${cfg.t_chips} 筹码`, chips, mult, op: 'joker', ref: jref }) }
    if (rule && scPerCardRule(rule)) {
      /* 逐牌规则在 ② 那一轮就算过了，这里不重复 */
    } else if (rule && (rule.k === 'yes' || rule.k === 'manual')) {
      /* 以前 manual 一律跳过，现在条件判定能认出来的就真算（局面 + 记录值参与判定），
         认不出来的才列进"没自动算"，并告诉用户去改哪里。 */
      const ok = condMatchesHand(rule.c, src, playedCount);
      if (ok === false) { /* 条件不满足，静默跳过 */ } else if (ok === null) {
        pending.push({ i: ji, n: scJokerName(src), why: '条件里有认不出运行时的东西 —— 试试点开这张牌填它的记录值' });
      } else {
        applyRule(rule, Object.assign({}, src, { name: tag }), rows, () => ({ chips, mult }), (v) => { chips = v.chips; mult = v.mult }, jref);
      }
    } else if (!rule && !scCfgDriven(src)) {
      pending.push({ i: ji, n: scJokerName(src), why: '原版这张牌改的是别的东西（金钱、手牌上限、生成消耗品…），结算这一手不加分' });
    }
    if (j.manual && (j.manual.chips || j.manual.mult || j.manual.xmult !== 1)) {
      chips += j.manual.chips || 0; mult += j.manual.mult || 0; mult *= j.manual.xmult || 1;
      rows.push({ label: `${j.name}（手填）+${j.manual.chips || 0} 筹码 +${j.manual.mult || 0} 倍率 ×${j.manual.xmult || 1}`, chips, mult, op: 'manual', ref: jref });
    }
  }

  /* ④.5 谁没算出来：把一行都没贡献的挑出来（有贡献的就不再提示了，免得满屏"没自动算"） */
  for (const w of pending) {
    const contributed = rows.some((r) => r.ref && r.ref.kind === 'joker' && r.ref.i === w.i && r.op !== 'note');
    if (!contributed) { warns.push(w); isManual = true }
  }

  /* ⑤ 手填修正 */
  if (SC.manual.chips || SC.manual.mult || SC.manual.xmult !== 1) {
    chips += SC.manual.chips || 0; mult += SC.manual.mult || 0; mult *= SC.manual.xmult || 1;
    rows.push({ label: '手填修正', chips, mult, op: 'manual', ref: { kind: 'manual' } });
  }
  return { chips, mult, score: Math.floor(chips * mult), rows, warns, hand, lvl };
}

/** 一条规则 → 应用到账目上（ref 让界面知道这一步是谁贡献的） */
function applyRule (rule, j, rows, get, set, ref) {
  let applied = false;
  /* 有些规则的 e 里同一条效果被列了两遍（提取时重叠了），去重后再结算，否则会算双份 */
  /* 同一条规则里同名字段出现了多次时：只留第一条，除非后面那条读的是这张牌自己的可变状态
   *  （Obelisk 那种两个分支要一起算）。scary_face 这类被提取成 chips=extra 与 mult=extra 两条，
   *  照着全算就会多给一份倍率 —— 原版只给筹码。 */
  const seenField = {};
  const effs = Array.from(new Set(rule.e)).filter((e) => {
    const f = e.split('=')[0];
    if (!seenField[f]) { seenField[f] = true; return true }
    return /self\.ability\.(mult|x_mult|chips)\b/.test(e) && !/self\.ability\.extra\./.test(e);
  });
  /* 最后的保险：拿这张牌自己的描述当裁判。Scary Face 的规则被提取成了 chips=extra 与
   *  mult=extra 两条，但它的描述只说给筹码 —— 那种情况下把倍率那条去掉。mod 的牌同样有
   *  本地化描述，所以这条对 mod 一样有效。 */
  let effsFinal = effs;
  try {
    const it = BY_ID[j.id];
    const lines = (it && it.text && (it.text[S.lang] || it.text['en-us'])) || [];
    const desc = lines.join(' ');
    if (desc && effs.length > 1) {
      const hasMult = /mult|倍率|xmult/i.test(desc);
      const hasChip = /chip|筹码/i.test(desc);
      if (hasChip && !hasMult) effsFinal = effs.filter((e) => !/^(mult|x_mult|mult_mod|Xmult_mod)=/.test(e));
      else if (hasMult && !hasChip) effsFinal = effs.filter((e) => !/^(chips|chip_mod)=/.test(e));
    }
  } catch (err) { /* 描述读不到就不筛 */ }
  for (const e of effsFinal) {
    const [field, expr] = e.split('=');
    const v = evalExpr(expr, j);
    const st = get();
    if (v == null) { rows.push({ label: `${j.name}：${field} 需要手填`, chips: st.chips, mult: st.mult, op: 'note', ref }); continue }
    applied = true;
    if (field === 'chip_mod' || field === 'chips') st.chips += v;
    else if (field === 'mult_mod' || field === 'mult') st.mult += v;
    else if (field === 'Xmult_mod' || field === 'x_mult') st.mult *= v;
    set(st);
    rows.push({
      label: `${j.name} ${field.indexOf('chip') === 0 || field === 'chips' ? '+' + v + ' 筹码' : field.indexOf('Xmult') === 0 || field === 'x_mult' ? '×' + v + ' 倍率' : '+' + v + ' 倍率'}`,
      chips: st.chips, mult: st.mult, op: 'joker', ref,
    });
  }
  return applied;
}

/** 找到某张小丑牌的规则（按名字，含别名） */
/** 这张牌的分是不是"写在配置里"的（花色/牌型/倍数那几族：Greedy、Jolly、The Duo…）。
 *  它们由通用逻辑处理，条件不满足时本来就没有贡献，不该提示"没自动算"。 */
/** 这条规则是"打出的每张牌各判一次"还是"整手牌结算一次"？
 *  原版按区域分：individual / repetition 是逐牌，main 是整手。抽出来的 k 有标错的时候
 *  （Scary Face、Smiley Face 这类被标成 manual，其实条件里就写着 context.other_card），
 *  所以这里以区域和条件为准。 */
function scPerCardRule (rule) {
  if (!rule) return false;
  if (rule.k === 'by-card' || rule.k === 'repeat') return true;
  if (/context\.other_card/.test(rule.c || '')) return true;
  return false;
}

function scCfgDriven (j) {
  const c = (j && j.cfg) || {};
  return !!(c.type || c.t_mult || c.t_chips || c.x_mult > 1 || c.effect === 'Suit Mult' || c.effect === 'Type Mult' || (c.extra && c.extra.suit));
}

function jokerRule (j) {
  if (!j || !j.name) return null;
  if (j.__rule === undefined) {
    const R = (typeof JOKER_RULES !== 'undefined' && JOKER_RULES.rules) || [];
    j.__rule = R.find((r) => r.n === j.name || (r.alias || []).includes(j.name)) || SC_EXTRA_RULES[j.name] || null;
  }
  return j.__rule;
}

/** 把图鉴里的一张小丑牌变成计算器条目 */
/** 从规则的条件与效果里认出这张牌自己的记录值字段（mod 的牌没有静态清单时用） */
function scFieldsFromRule (rule) {
  const txt = ((rule && rule.e) || []).join(' ') + ' ' + ((rule && rule.c) || '');
  const out = [];
  const re = /self\.ability\.([A-Za-z_][\w.]*)/g;
  let m;
  while ((m = re.exec(txt))) {
    const key = m[1];
    if (/^(name|effect|set|type|order)$/.test(key)) continue;
    if (/^extra\.(size|mult|x_mult|chips|dollars|chip_mod|s_mult|suit|hand_add|discard_sub)$/.test(key)) continue;
    if (out.indexOf(key) < 0) out.push(key);
  }
  return out;
}
/** 描述里某个 #N# 对应的表达式 → 这张牌可改的参数（认不出就返回 null） */
function scParamForExpr (j, expr) {
  const path = String(expr == null ? '' : expr).split(',')[0].trim();
  if (!path) return null;
  for (const p of scJokerParams(j)) if (p.path === path) return p;
  const re = /self\.ability\.([A-Za-z_][\w.]*)/g;
  let m;
  while ((m = re.exec(path))) {
    const f = m[1];
    if ((j.fields || []).indexOf(f) >= 0) return { path: 'self.ability.' + f, type: 'num', label: scFieldLabel(f) };
  }
  return null;
}

/** 参数 → 内联控件（花色/点数下拉、数字输入） */
function scParamCtl (j, prm, cls) {
  const cur = (j.params && j.params[prm.path]) || '';
  const k = 'phin ' + (cls || '');
  if (prm.type === 'suit') {
    return '<select class="' + k + '" data-jparam="' + esc(prm.path) + '"><option value="">未指定</option>' +
      ['S', 'H', 'D', 'C'].map((s) => '<option value="' + SUIT_EN[s] + '"' + (cur === SUIT_EN[s] ? ' selected' : '') + '>' + SUIT_LABEL[s] + SUIT_SYM[s] + '</option>').join('') + '</select>';
  }
  if (prm.type === 'rank') {
    return '<select class="' + k + '" data-jparam="' + esc(prm.path) + '"><option value="">未指定</option>' +
      ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'].map((r) => '<option value="' + r + '"' + (cur === r ? ' selected' : '') + '>' + r + '</option>').join('') + '</select>';
  }
  return '<input class="' + k + '" type="number" step="0.5" data-jparam="' + esc(prm.path) + '" value="' + (cur === '' ? 0 : cur) + '">';
}

/** #N# 用不到控件时，直接把原版算出来的数值显示出来（例如 X1.5 倍率） */
function scExprValue (j, expr) {
  const v = evalExpr(String(expr).split(',')[0].trim(), j);
  if (typeof v !== 'number' || !isFinite(v)) return null;
  return Number.isInteger(v) ? String(v) : String(+v.toFixed(2));
}

/** 这张牌自己的描述：原版里 #1# #2# 就是动态值的位置，这里就地变成控件。
 *  古老小丑那句「打出的 #2#」里的 #2# 就是一个花色下拉。 */
function scJokerDescHtml (j) {
  const it = j && BY_ID[j.id];
  const lines = (it && it.text && (it.text[S.lang] || it.text['en-us'])) || [];
  if (!lines.length) return '';
  const lv = JOKER_LOCVARS[j.name] || [];
  return '<div class="scjdesc">' + lines.map(function (line) {
    let html = markup(line).replace(/#(\d+)#/g, function (all, n) {
      const expr = lv[(+n) - 1];
      if (!expr) return '<b class="ph">' + all + '</b>';
      const prm = scParamForExpr(j, expr);
      if (prm) return scParamCtl(j, prm, 'inline');
      const v = scExprValue(j, expr);
      return '<b class="ph">' + (v == null ? all : v) + '</b>';
    });
    /* 有些描述在生成数据时就把 #2# 换成了具体花色（打出的黑桃牌），这里把那几个花色词
     * 本身换成下拉，效果和占位符一样：文本里的动态值就地可改。 */
    for (const prm of scJokerParams(j)) {
      if (prm.type !== 'suit') continue;
      for (const s of ['S', 'H', 'D', 'C']) {
        const nmS = SUIT_LABEL[s];
        if (html.indexOf(nmS) >= 0) { html = html.replace(nmS, scParamCtl(j, prm, 'inline')); break }
      }
    }
    return '<div class="ln">' + html + '</div>';
  }).join('') + '</div>';
}


/** 记录值的初值：原版新建时 self.ability.x_mult 之类的起点（Hologram ×1、Ramen ×2、冰激凌 +100…） */
function scInitJokerState (cfg, fields) {
  const st = {};
  for (const f of fields) {
    if (f === 'x_mult') {
      st[f] = typeof cfg.Xmult === 'number' ? cfg.Xmult
        : (cfg.extra && typeof cfg.extra === 'object' && typeof cfg.extra.xmult === 'number') ? cfg.extra.xmult
          : 1;
    } else if (f === 'mult') st[f] = typeof cfg.mult === 'number' ? cfg.mult : 0;
    else if (/^extra\.(chips|dollars|mult|x_mult)$/.test(f)) st[f] = (cfg.extra && typeof cfg.extra[f.split('.')[1]] === 'number') ? cfg.extra[f.split('.')[1]] : 0;
    else if (f === 'extra') st[f] = typeof cfg.extra === 'number' ? cfg.extra : 0;
    else st[f] = 0;
  }
  return st;
}

/* 这些牌的分不在 card.lua 的 calculate_joker 里（原版是在 update / redeem 里先算好、存进
   self.ability.x_mult，结算时直接读），.work/gen-rules.js 抽不到，就照同一条源码手写。
   条件与效果格式和抽出来的规则完全一样，判定也走同一套（局面 + 记录值）。 */
const SC_EXTRA_RULES = {
  /* card.lua:4203-4208 —— x_mult = 空栏位数 + 自己这张数 */
  'Joker Stencil': { k: 'yes', c: '', e: ['Xmult_mod=self.ability.x_mult'] },
  /* 这几张的结算就是读自己累计的 x_mult（card.lua:3657/3970） */
  Hologram: { k: 'yes', c: '', e: ['Xmult_mod=self.ability.x_mult'] },
  Constellation: { k: 'yes', c: '', e: ['Xmult_mod=self.ability.x_mult'] },
  Throwback: { k: 'yes', c: 'self.ability.x_mult > 1', e: ['Xmult_mod=self.ability.x_mult'] },
  'Glass Joker': { k: 'yes', c: 'self.ability.x_mult > 1', e: ['Xmult_mod=self.ability.x_mult'] },
  Yorick: { k: 'yes', c: 'self.ability.x_mult > 1', e: ['Xmult_mod=self.ability.x_mult'] },
  'Hit the Road': { k: 'yes', c: 'self.ability.x_mult > 1', e: ['Xmult_mod=self.ability.x_mult'] },
  Campfire: { k: 'yes', c: 'self.ability.x_mult > 1', e: ['Xmult_mod=self.ability.x_mult'] },
  Ramen: { k: 'yes', c: 'self.ability.x_mult > 1', e: ['Xmult_mod=self.ability.x_mult'] },
  Madness: { k: 'yes', c: '', e: ['Xmult_mod=self.ability.x_mult'] },
  /* 靠 current_round 里那个动态值判分的几张（原版写在别处，抽不出来） */
  'Ancient Joker': { k: 'by-card', c: 'context.other_card:is_suit(G.GAME.current_round.ancient_card.suit)', e: ['Xmult_mod=self.ability.extra'] },
  'The Idol': { k: 'by-card', c: 'context.other_card:get_id() == G.GAME.current_round.idol_card.id and context.other_card:is_suit(G.GAME.current_round.idol_card.suit)', e: ['Xmult_mod=self.ability.extra'] },
  Castle: { k: 'yes', c: 'self.ability.extra.chips > 0', e: ['chip_mod=self.ability.extra.chips'] },
  Canio: { k: 'yes', c: 'self.ability.caino_xmult > 1', e: ['Xmult_mod=self.ability.caino_xmult'] },
  'Lucky Cat': { k: 'yes', c: 'self.ability.x_mult > 1', e: ['Xmult_mod=self.ability.x_mult'] },
  /* Blackboard：手里和打出的牌全是黑桃/梅花时 ×3（值在 update 里算好） */
  Blackboard: { k: 'yes', c: 'self.ability.__black > 0', e: ['Xmult_mod=self.ability.__black'] },
};

/** 没在手填的参数，用局面里的同名值兜底（例如全局的"已用塔罗牌"） */
function scApplyAutoParams () {
  for (const j of SC.jokers) {
    j.params = j.params || {};
    for (const prm of scJokerParams(j)) {
      if (j.params[prm.path] !== undefined && j.params[prm.path] !== '') continue;
      const v = SC_ENV_ALIAS[prm.path];
      if (v && SC.env[v] !== undefined) j.params[prm.path] = SC.env[v];
    }
  }
}

/* 这些路径和"整体修改"里的字段是同一个东西（没重复放两组输入，直接引用） */
const SC_ENV_ALIAS = {
  'G.GAME.consumeable_usage_total.tarot': 'tarotUsed',
  'G.GAME.consumeable_usage_total.planet': 'planetUsed',
  'G.GAME.consumeable_usage_total.spectral': 'spectralUsed',
};

/** 原版每帧 update 里会先算好的一些值（Joker Stencil 的 x_mult、Blackboard 条件…），
 *  结算前按同样的规则更新一遍 —— 这样文件里"算好再读"的牌也算得对。 */
function scUpdateJokers () {
  const stencils = SC.jokers.filter((j) => j.name === 'Joker Stencil').length;
  const allBlack = SC.played.concat(SC.held).every((c) => c.suit === 'S' || c.suit === 'C');
  const nCards = SC.played.length + SC.held.length;
  for (const j of SC.jokers) {
    if (j.name === 'Joker Stencil') j.state.x_mult = (SC.env.jokerSlots - SC.jokers.length) + stencils;
    if (j.name === 'Blackboard') j.state.__black = (allBlack && nCards > 0) ? Number(j.cfg.extra) || 3 : 0;
  }
}

function jokerFromItem (it) {
  const c = Object.assign({}, it.config || {});
  /* 原版配置里倍数写的是大写的 Xmult（The Duo / The Trio / Ramen / Hologram…），
     引擎里统一用小写 x_mult，这里对一下 */
  if (typeof c.Xmult === 'number' && typeof c.x_mult !== 'number') c.x_mult = c.Xmult;
  /* 这张牌有哪些累计值（self.ability.mult / x_mult / extra.chips …）是 gen-state.js
     从游戏源码里扫出来的；新建时都是 0（原版也一样），界面上可以手填。 */
  /* 记录值字段：优先用 gen-state.js 扫出来的；没有（mod 的牌）就从规则表达式里现认 */
  let fields = (JOKER_STATE.jokers[it.name || ''] || {}).mutable || [];
  if (!fields.length) {
    const rr = (typeof JOKER_RULES !== 'undefined' && JOKER_RULES.rules ? JOKER_RULES.rules : []).find(function (r) { return r.n === (it.name || '') }) || SC_EXTRA_RULES[it.name || ''];
    if (rr) fields = scFieldsFromRule(rr);
  }
  const state = scInitJokerState(c, fields);
  return {
    id: it.id, name: it.name || it.id,
    /* effect 是「中心」上的字段（例如 'Suit Mult'），不在 config 里，但规则要用它 */
    cfg: Object.assign({}, c, { effect: it.effect, extra: c.extra }),
    growth: 0,
    state: state,
    fields: fields,
    manual: { chips: 0, mult: 0, xmult: 1 },
  };
}

/* ================================================================ 得分计算器
 * 界面照游戏里那套来：真实的卡图排成行（小丑在上、打出的牌在中、留手在下面），
 * 中间是游戏同款的「筹码 × 倍率」，底下是逐步播放 —— 每一步会高亮贡献它的那张牌
 * 或那张小丑，并把它们的贡献浮在旁边。纯数字看不出所以然，这样才一眼明白分从哪来。 */

/* 卡图缓存：compose 里可能跑 WebGL 着色器（版本特效），同一种牌反复重画很贵。
   缓存住"源画布"，用的时候再 drawImage 复制一份（复制几乎不花时间，而且每个卡位
   必须是自己的 canvas 节点）。 */
const SC_CACHE = new Map();
const SC_CACHE_MAX = 160;
function scCachedCanvas (sig, make) {
  let src = SC_CACHE.get(sig);
  if (!src) {
    src = make();
    if (!src) return null;
    if (SC_CACHE.size >= SC_CACHE_MAX) SC_CACHE.delete(SC_CACHE.keys().next().value);
    SC_CACHE.set(sig, src);
  }
  const cv = document.createElement('canvas');
  cv.width = src.width; cv.height = src.height;
  cv.getContext('2d').drawImage(src, 0, 0);
  return cv;
}
const scCardSig = (c, s) => ['c', s, c.rank, c.suit, c.enh || '', c.ed || '', c.seal || '', S.phase].join('|');
const scJokerSig = (j, s) => ['j', s, j.id, j.ed || '', S.phase].join('|');

/** 一张扑克牌的真实卡图（中心框 + 牌面 + 强化 + 版本 + 蜡封） */
function scoreCardCanvas (c, scale) { return scCachedCanvas(scCardSig(c, scale), () => scCardRaw(c, scale)) }
function scCardRaw (c, scale) {
  const id = c.suit + '_' + (c.rank === '10' ? 'T' : c.rank);
  const face = BY_ID[id];
  const enh = c.enh ? BY_ID[c.enh] : null;
  const spec = {
    center: enh ? { atlas: 'centers', pos: enh.pos, stoneNoFront: enh.id === 'm_stone' } : { atlas: 'centers', pos: COM.baseCenter.pos },
    front: face ? { atlas: face.atlas, pos: face.pos } : null,
    edition: c.ed ? editionShaderOf(BY_ID[c.ed]) : null,
    seal: c.seal || null,
  };
  return compose(spec, scale, S.phase);
}

/** 一张小丑牌的真实卡图 */
function scoreJokerCanvas (j, scale) { return scCachedCanvas(scJokerSig(j, scale), () => scJokerRaw(j, scale)) }
function scJokerRaw (j, scale) {
  const it = BY_ID[j.id];
  if (!it) return null;
  const spec = Object.assign({}, specForItem(it));
  if (j.ed) spec.edition = editionShaderOf(BY_ID[j.ed]);
  return compose(spec, scale, S.phase);
}

/** 把 canvas 包成一个可以点的小卡位 */
function spriteTile (cv, cls, title) {
  const d = document.createElement('div');
  d.className = 'sctile' + (cls ? ' ' + cls : '');
  if (title) d.title = title;
  if (cv) d.appendChild(cv);
  return d;
}

const SC_UI = { edit: null, step: -1, playing: false, timer: null, order: [], focus: null, joker: null };

/* ================================================================ 卡牌选择器
 * 照游戏的「收藏」页做：分类在左边、搜索在上面、中间是真实卡图网格。
 * 目的只有一个：加小丑牌 / 加牌别再走「先点＋ → 下拉 → 搜索 → 再点按钮」四步，
 * 而是「点开 → 点一张 → 点一张 → 完成」。 */
const SUIT_EN2S = { Spades: 'S', Hearts: 'H', Diamonds: 'D', Clubs: 'C' };
const SUIT_ORDER = ['S', 'H', 'D', 'C'];
const SCP = { open: false, tab: 'Joker', q: '', suit: '', added: 0, addedList: [] };

/** 图鉴里的扑克牌条目 → 计分器的牌（点数/花色） */
function scCardFromItem (it) {
  const suit = SUIT_EN2S[it.suit] || String(it.id || 'S_2')[0];
  let rank = it.value != null ? String(it.value) : '';
  if (!rank) rank = String(it.id || '').split('_')[1] || '10';
  return scCard(rank === 'T' ? '10' : rank, suit);
}

/** 当前分类 + 搜索 + 花色筛选下的可选条目 */
function scPickerList () {
  const q = SCP.q.trim().toLowerCase();
  let list = ITEMS.filter((x) => x.cat === SCP.tab);
  if (SCP.tab === 'PlayingCard') {
    if (SCP.suit) list = list.filter((x) => scCardFromItem(x).suit === SCP.suit);
    /* 像游戏里的牌堆那样排：花色 → 点数 */
    list = list.slice().sort((a, b) => {
      const A = scCardFromItem(a); const B = scCardFromItem(b);
      return SUIT_ORDER.indexOf(A.suit) - SUIT_ORDER.indexOf(B.suit) ||
        (RANK_ID[A.rank] || 0) - (RANK_ID[B.rank] || 0);
    });
  }
  if (q) {
    list = list.filter((x) => (x.id + ' ' + (x.name || '') + ' ' + (x.source || '') + ' ' + (x.sourceName || '')).toLowerCase().includes(q));
  }
  return list;
}

/** 网格里的一格（真实卡图，滚到才画） */
function scPickerCell (it) {
  const cell = document.createElement('button');
  cell.className = 'scpkcell';
  cell.dataset.id = it.id;
  cell.title = (it.name || it.id) + (it.source ? ' · MOD' : '') + '\n点一下加入';
  const art = document.createElement('span');
  art.className = 'scpkart';
  art.innerHTML = '<i class="scpkph"></i>';
  cell.appendChild(art);
  let painted = false;
  const paint = () => {
    if (painted) return; painted = true;
    const cv = it.cat === 'Joker' ? scoreJokerCanvas(jokerFromItem(it), 2) : scoreCardCanvas(scCardFromItem(it), 2);
    if (!cv) return;
    cv.style.width = '71px'; cv.style.height = '95px';
    art.innerHTML = ''; art.appendChild(cv);
  };
  if (IO) { cell._paint = paint; IO.observe(cell) } else paint();
  const n = document.createElement('span');
  n.className = 'scpkname'; n.textContent = nm(it);
  cell.appendChild(n);
  if (it.source) {
    const m = document.createElement('span');
    m.className = 'scpkmod'; m.textContent = 'MOD'; m.title = it.sourceName || it.source;
    cell.appendChild(m);
  }
  cell.onclick = () => scPickerAdd(it, cell);
  /* 原版收藏页里「悬停就出说明框」（G.UIDEF.card_h_popup）：名字 + 描述 + 稀有度/价格 */
  cell.onmouseenter = () => scPickerTip(it, cell);
  cell.onmouseleave = () => scPickerTipHide();
  return cell;
}

/** 悬停说明框：位置照原版 —— 牌在上半屏就显示在下面，在下半屏就显示在上面 */
function scPickerTip (it, cell) {
  const panel = document.querySelector('.scpickpanel');
  if (!panel) return;
  let tip = document.getElementById('scPickTip');
  if (!tip) {
    tip = document.createElement('div');
    tip.id = 'scPickTip';
    tip.className = 'scpicktip';
    panel.appendChild(tip);
  }
  const lines = (it.text && (it.text[S.lang] || it.text['en-us'])) || [];
  const meta = [categoryLabel(it.cat), it.rarity ? RARITY[it.rarity] : null, it.cost != null ? '\$' + it.cost : null, it.source ? 'MOD' : null].filter(Boolean).join(' · ');
  tip.innerHTML = '<div class="scpicktipname">' + esc(nm(it)) + '</div>' +
    (lines.length ? lines.map((l) => '<div class="ln">' + markup(l) + '</div>').join('') : '<div class="ln" style="opacity:.6">—</div>') +
    '<div class="scpicktipmeta">' + esc(meta) + (it.source ? '　' + esc(it.id) : '') + '</div>';
  const pr = panel.getBoundingClientRect();
  const cr = cell.getBoundingClientRect();
  tip.style.display = 'block';
  const tw = tip.offsetWidth, th = tip.offsetHeight;
  const above = cr.top < pr.top + pr.height / 2;
  let left = cr.left + cr.width / 2 - tw / 2 - pr.left;
  left = Math.max(6, Math.min(pr.width - tw - 6, left));
  tip.style.left = Math.round(left) + 'px';
  tip.style.top = Math.round(above ? (cr.bottom - pr.top + 6) : (cr.top - pr.top - th - 6)) + 'px';
}

function scPickerTipHide () {
  const tip = document.getElementById('scPickTip');
  if (tip) tip.style.display = 'none';
}

function scPickerAdd (it, cell) {
  scStopPlay();
  let ref = null;
  if (it.cat === 'Joker') {
    const j = jokerFromItem(it);
    if (!j) return;
    SC.jokers.push(j);
    ref = j;
  } else {
    const c = scCardFromItem(it);
    SC.played.push(c);                 /* 新加的牌默认就是「打出去的」，再点一下才变成留手 */
    SC_UI.order.push(c);
    SC_UI.focus = c;
    ref = c;
  }
  SCP.addedList.push({ kind: it.cat === 'Joker' ? 'joker' : 'card', ref, name: nm(it), id: it.id });
  SCP.added++;
  if (cell) { cell.classList.add('just'); setTimeout(() => cell.classList.remove('just'), 420) }
  scPickerMarkPicked();
  scPickerHead();
  render();
}

/** 撤销上一次加入（或者清掉本次加的全部） */
function scPickerUndo () {
  const last = SCP.addedList.pop();
  if (!last) { toast('这次还没加过东西'); return }
  scPickerRemove(last.ref);
  scPickerMarkPicked();
  scPickerHead();
  render();
}

function scPickerClearAdded () {
  const n = SCP.addedList.length;
  for (const a of SCP.addedList) scPickerRemove(a.ref);
  SCP.addedList = [];
  SCP.added = 0;
  scPickerMarkPicked();
  scPickerHead();
  render();
  if (n) toast('已撤掉本次加入的 ' + n + ' 张');
}

/** 把一张牌/一张小丑从桌上拿掉（撤销与清单里的 ✕ 都用它） */
function scPickerRemove (ref) {
  if (!ref) return;
  let i = SC.jokers.indexOf(ref);
  if (i >= 0) SC.jokers.splice(i, 1);
  i = SC.played.indexOf(ref);
  if (i >= 0) SC.played.splice(i, 1);
  i = SC.held.indexOf(ref);
  if (i >= 0) SC.held.splice(i, 1);
  i = SC_UI.order.indexOf(ref);
  if (i >= 0) SC_UI.order.splice(i, 1);
  if (SC_UI.focus === ref) SC_UI.focus = null;
}

/** 这一个条目现在桌上有几份（给格子角标和"已选"高亮用） */
function scPickerCountOf (it) {
  if (it.cat === 'Joker') return SC.jokers.filter((j) => j.id === it.id).length;
  const c = scCardFromItem(it);
  return SC.played.concat(SC.held).filter((x) => x.rank === c.rank && x.suit === c.suit).length;
}

/** 给已经加过的格子上角标（这就是"我选了什么"的反馈） */
function scPickerMarkPicked () {
  const grid = document.getElementById('scPickGrid');
  if (!grid) return;
  grid.querySelectorAll('.scpkcell').forEach((cell) => {
    const it = BY_ID[cell.dataset.id];
    if (!it) return;
    const n = scPickerCountOf(it);
    cell.classList.toggle('picked', n > 0);
    let b = cell.querySelector('.scpkpick');
    if (n > 0) {
      if (!b) { b = document.createElement('span'); b.className = 'scpkpick'; cell.appendChild(b) }
      b.textContent = n > 1 ? '×' + n : '✓';
    } else if (b) b.remove();
  });
}

/** 「桌上 N 张 · 本次已加入 M 张」+ 本次加入的清单（每条都能单独撤） */
function scPickerHead () {
  const el = document.querySelector('#scPick .scpickcount');
  if (el) {
    const n = SC.jokers.length + SC.played.length + SC.held.length;
    el.innerHTML = '桌上现在 <b>' + n + '</b> 张' + (SCP.addedList.length ? '　·　本次加入 <b>' + SCP.addedList.length + '</b> 张' : '');
  }
  const log = document.getElementById('scPickLog');
  if (log) {
    log.innerHTML = SCP.addedList.length
      ? SCP.addedList.map((a, i) => `<button class="scpicklogchip" data-undo="${i}" title="点一下撤掉这张">${esc(a.name)} ✕</button>`).join('')
      : '<span class="scpicklogempty">还没加东西。点下面的卡图就是加入，加错了点「↩ 撤销」。</span>';
  }
  const undo = document.getElementById('scPickUndo');
  if (undo) undo.disabled = !SCP.addedList.length;
  const clr = document.getElementById('scPickClear');
  if (clr) clr.disabled = !SCP.addedList.length;
}

function scPickerRender () {
  const root = document.getElementById('scPick');
  if (!root) return;
  const grid = root.querySelector('#scPickGrid');
  const list = scPickerList();
  grid.innerHTML = '';
  if (!list.length) {
    grid.innerHTML = '<div class="scpkempty">没找到。换个词，或切到别的分类。</div>';
  } else {
    const frag = document.createDocumentFragment();
    for (const it of list) frag.appendChild(scPickerCell(it));
    grid.appendChild(frag);
  }
  root.querySelectorAll('.scpickcat').forEach((b) => b.classList.toggle('on', b.dataset.tab === SCP.tab));
  root.querySelector('.scpicksuits').style.display = SCP.tab === 'PlayingCard' ? '' : 'none';
  root.querySelectorAll('.scpicksuit').forEach((b) => b.classList.toggle('on', b.dataset.suit === SCP.suit));
  const hint = root.querySelector('.scpickhint');
  const cnt = { Joker: ITEMS.filter((x) => x.cat === 'Joker').length, PlayingCard: ITEMS.filter((x) => x.cat === 'PlayingCard').length };
  hint.textContent = (SCP.tab === 'Joker' ? '小丑牌自左向右结算' : '加进来的牌默认算「打出去」，再点一下就是留手') +
    '　·　共 ' + (cnt[SCP.tab] || 0) + ' 项';
  scPickerMarkPicked();
  scPickerHead();
}

function openScPicker (tab) {
  closeScPicker();
  SCP.open = true; SCP.added = 0; SCP.addedList = [];
  if (tab) SCP.tab = tab;
  const root = document.createElement('div');
  root.id = 'scPick';
  root.className = 'scpick';
  root.innerHTML = `
    <div class="scpickpanel">
      <div class="scpicktop">
        <b>选择卡牌</b>
        <span class="scpickhint"></span>
        <span class="scpickcount"></span>
        <button class="btn orange" id="scPickUndo" title="撤销上一次加入">↩ 撤销</button>
        <button class="btn" id="scPickClear" title="撤掉本次加入的全部">清空本次</button>
        <button class="btn primary" id="scPickDone">完成 ✓</button>
      </div>
      <div class="scpicklog" id="scPickLog"></div>
      <div class="scpickcols">
        <nav class="scpickcats">
          <button class="scpickcat" data-tab="Joker">♣ 小丑牌</button>
          <button class="scpickcat" data-tab="PlayingCard">🂡 扑克牌</button>
        </nav>
        <div class="scpickmain">
          <div class="scpickfilter">
            <input id="scPickQ" placeholder="搜索名字或 id…" autocomplete="off">
            <span class="scpicksuits">
              <button class="scpicksuit" data-suit="">全部</button>
              <button class="scpicksuit" data-suit="S">♠</button>
              <button class="scpicksuit" data-suit="H">♥</button>
              <button class="scpicksuit" data-suit="D">♦</button>
              <button class="scpicksuit" data-suit="C">♣</button>
            </span>
          </div>
          <div class="scpickgrid" id="scPickGrid"></div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(root);
  root.addEventListener('click', (e) => {
    if (e.target === root) { closeScPicker(); return }
    const cat = e.target.closest('.scpickcat');
    if (cat) { SCP.tab = cat.dataset.tab; scPickerRender(); return }
    const su = e.target.closest('.scpicksuit');
    if (su) { SCP.suit = su.dataset.suit; scPickerRender(); return }
    const chip = e.target.closest('[data-undo]');
    if (chip) {
      const a = SCP.addedList[+chip.dataset.undo];
      if (a) { SCP.addedList.splice(+chip.dataset.undo, 1); scPickerRemove(a.ref); scPickerMarkPicked(); scPickerHead(); render() }
      return;
    }
    if (e.target.id === 'scPickUndo') { scPickerUndo(); return }
    if (e.target.id === 'scPickClear') { scPickerClearAdded(); return }
    if (e.target.id === 'scPickDone') closeScPicker();
  });
  root.querySelector('#scPickQ').addEventListener('input', (e) => { SCP.q = e.target.value; scPickerRender() });
  scPickerRender();
  const qi = root.querySelector('#scPickQ');
  if (qi && !('ontouchstart' in window)) qi.focus();
}

function closeScPicker () {
  const root = document.getElementById('scPick');
  if (root) root.remove();
  SCP.open = false;
}

function scPickerToggle (tab) {
  if (SCP.open && SCP.tab === tab) closeScPicker();
  else openScPicker(tab);
}

/* ---- 手牌：SC.played / SC.held 是引擎认的数组，UI 另记一份视觉顺序 ---- */
/** 原版里选中的牌是「原地抬起」，不是跳到最后一张 —— 所以顺序要单独存 */
function scOrderSync () {
  const all = SC.played.concat(SC.held);
  const kept = SC_UI.order.filter((c) => all.indexOf(c) >= 0);
  if (kept.length !== all.length) {
    for (const c of all) if (kept.indexOf(c) < 0) kept.push(c);   /* 外部直接塞进数组的情况 */
    SC_UI.order = kept;
  }
  return SC_UI.order;
}

function scIsPlayed (c) { return SC.played.indexOf(c) >= 0 }

/** 点一下卡图：在「打出去」和「留在手里」之间切换 */
function scToggleCard (c) {
  const i = SC.played.indexOf(c);
  if (i >= 0) { SC.played.splice(i, 1); SC.held.push(c) } else {
    const k = SC.held.indexOf(c);
    if (k >= 0) SC.held.splice(k, 1);
    SC.played.push(c);
  }
  SC_UI.focus = c;
}

function scRemoveCard (c) {
  for (const arr of [SC.played, SC.held]) {
    const i = arr.indexOf(c);
    if (i >= 0) arr.splice(i, 1);
  }
  const k = SC_UI.order.indexOf(c);
  if (k >= 0) SC_UI.order.splice(k, 1);
  if (SC_UI.focus === c) SC_UI.focus = null;
  if (SC_UI.edit && SC_UI.edit.card === c) SC_UI.edit = null;
}

/** 一手常见的牌，方便一秒钟进入有意义的局面 */
const SC_PRESETS = {
  '同花五张': { hand: 'Flush', cards: [['A', 'S'], ['K', 'S'], ['Q', 'S'], ['J', 'S'], ['9', 'S']], held: [['2', 'H'], ['7', 'D']], jokers: ['j_joker', 'j_greedy_joker'] },
  '葫芦': { hand: 'Full House', cards: [['K', 'S'], ['K', 'H'], ['K', 'D'], ['9', 'C'], ['9', 'S']], held: [['3', 'H']], jokers: ['j_joker', 'j_cavendish'] },
  '一对 + 钢铁留手': { hand: 'Pair', cards: [['A', 'S'], ['A', 'H']], held: [['K', 'D', 'm_steel'], ['Q', 'C']], jokers: ['j_joker'] },
  '高牌测试': { hand: 'High Card', cards: [['2', 'C']], held: [], jokers: [] },
};

function scApplyPreset (name) {
  const p = SC_PRESETS[name];
  if (!p) return;
  scStopPlay();
  SC.hand = p.hand; SC.level = 1;
  SC.played = p.cards.map((c) => scCard(c[0], c[1], c[2] || '', c[3] || '', c[4] || ''));
  SC.held = (p.held || []).map((c) => scCard(c[0], c[1], c[2] || '', c[3] || '', c[4] || ''));
  SC.jokers = (p.jokers || []).map((id) => jokerFromItem(BY_ID[id])).filter(Boolean);
  SC.manual = { chips: 0, mult: 0, xmult: 1 };
  SC_UI.order = SC.played.concat(SC.held);
  SC_UI.edit = null; SC_UI.focus = null; SC_UI.step = -1;
  render();
}

/** 随便发一手（8 张），像发牌那样 */
function scDealHand (n) {
  scStopPlay();
  const ranks = Object.keys(RANK_CHIPS);
  const suits = SUIT_ORDER;
  SC.played = []; SC.held = [];
  for (let i = 0; i < (n || 8); i++) {
    SC.held.push(scCard(ranks[Math.floor(Math.random() * ranks.length)], suits[Math.floor(Math.random() * 4)]));
  }
  SC_UI.order = SC.played.concat(SC.held);
  SC_UI.focus = null; SC_UI.edit = null; SC_UI.step = -1;
  render();
}

function scStopPlay () {
  SC_UI.playing = false;
  if (SC_UI.timer) { clearInterval(SC_UI.timer); SC_UI.timer = null }
}

/* ================================================================ 牌型自动判定
 * 原版是拿"打出去的牌"判牌型的（evaluate_play 里的 poker_hand 检测），所以这里也按同样的
 * 顺序从强到弱判一遍。四指 / 捷径 / 涂抹小丑这三张会改判定规则，桌上有它们时自动放宽。 */
function scDetectHand () {
  const cards = SC.played.slice();
  if (!cards.length) return null;
  const has = (n) => SC.jokers.some((j) => j.name === n);
  const fingers = has('Four Fingers');       /* 同花 / 顺子 4 张即可 */
  const shortcut = has('Shortcut');           /* 顺子允许跳点数 */
  const smeared = has('Smeared Joker');       /* 红桃=方块、黑桃=梅花 */
  const suitOf = (c) => (smeared ? ({ H: 'R', D: 'R', S: 'B', C: 'B' }[c.suit] || c.suit) : c.suit);
  /* 石头牌没有点数与花色（原版也是），判牌型时不计入花色/点数 */
  const live = cards.filter((c) => c.enh !== 'm_stone');
  const cnt = {};
  for (const c of live) cnt[RANK_ID[c.rank]] = (cnt[RANK_ID[c.rank]] || 0) + 1;
  const groups = Object.values(cnt).sort((a, b) => b - a);
  const sc = {};
  for (const c of live) sc[suitOf(c)] = (sc[suitOf(c)] || 0) + 1;
  const need = fingers ? 4 : 5;
  const allLive = live.length === cards.length;
  const sameSuit = allLive && live.length >= need && Object.values(sc).some((v) => v >= need);
  const isStraight = (() => {
    const u = [...new Set(live.map((c) => RANK_ID[c.rank]))].sort((a, b) => a - b);
    if (!allLive || u.length < need) return false;
    const runs = (arr) => {
      for (let i = 1; i < arr.length; i++) {
        const gap = arr[i] - arr[i - 1];
        if (gap === 1) continue;
        if (shortcut && gap === 2) continue;          /* 捷径：跳一个点数也算连着 */
        return false;
      }
      return arr.length >= need;
    };
    if (runs(u)) return true;
    if (u.includes(14)) {                              /* A 可以当 1（A2345） */
      const v = [1].concat(u.filter((x) => x !== 14)).sort((a, b) => a - b);
      if (runs(v)) return true;
    }
    return false;
  })();
  const five = cards.length >= 5;
  const top = groups[0] || 0;
  const second = groups[1] || 0;
  if (five && top >= 5 && sameSuit) return 'Flush Five';
  if (five && top === 3 && second === 2 && sameSuit) return 'Flush House';
  if (five && top >= 5) return 'Five of a Kind';
  if (sameSuit && isStraight) return 'Straight Flush';
  if (top >= 4) return 'Four of a Kind';
  if (top === 3 && second >= 2) return 'Full House';
  if (sameSuit) return 'Flush';
  if (isStraight) return 'Straight';
  if (top >= 3) return 'Three of a Kind';
  if (top === 2 && second === 2) return 'Two Pair';
  if (top === 2) return 'Pair';
  return 'High Card';
}

/** 把"打出去的牌"判出来的牌型写回 SC.hand；玩家手动指定过就不动 */
function scSyncHand () {
  if (SC.handMode === 'manual') return;
  const d = scDetectHand();
  if (d) SC.hand = d;
}

/* ---- 牌型的中文名（图鉴数据里每种牌型都有 5 种语言的 i18n） ---- */
function handCN (h) {
  const cn = (h && h.i18n && (h.i18n[S.lang] || h.i18n.zh_CN)) || (h && h.name) || '';
  return cn;
}
function handLabel (h) {
  const cn = handCN(h);
  return cn === h.name ? cn : cn + '（' + h.name + '）';
}
function handByKey (key) { return D.hands.find((h) => h.name === key) || D.hands[0] }

/* ---- 局面：原版算分读到的外部状态，全部可以改（gen-state.js 扫出来的字段） ---- */
/* 整体修改只留"原版里 2 张以上小丑牌会用到"的字段（由 gen-state.js 扫出来的用法统计决定）。
   只被一张牌用到的（例如占卜师的"已用塔罗牌"）挪到那张牌自己的弹窗里，见 scJokerEnvFields()。 */
const SC_ENV_FIELDS = [
  ['dollars', '金钱 $', 0, 9999],                    /* 5 张：Vagabond / Bull / Bootstraps / The Hermit… */
  ['discardsLeft', '剩余弃牌', 0, 99],               /* 4 张：Banner / Mystic Summit / Delayed Gratification / Burglar */
  ['discardsUsed', '本回合已弃牌', 0, 99],           /* 3 张 */
  ['handsLeft', '剩余出牌', 0, 99],                  /* 2 张：Dusk / Acrobat */
  ['handsPlayed', '本回合已出牌', 0, 99],            /* 2 张：Sixth Sense / DNA */
  ['deckCards', '牌堆剩几张', 0, 999],               /* 5 张：Blue Joker / Erosion… */
  ['deckSize', '起始牌组张数', 0, 999],              /* 配合 Erosion */
  ['handCards', '手里几张', 0, 99],
  ['jokerSlots', '小丑栏位', 0, 30],                 /* Joker Stencil 等 */
  ['consumeableSlots', '消耗品牌位', 0, 10],
  ['consumeablesUsed', '已有消耗品', 0, 10],
];

/* 这张牌读的"动态值"按类型分：花色 / 点数 / 数字。同名路径的取值由玩家在它自己的弹窗里给。 */
const SC_PARAM_SUIT = /^G\.GAME\.current_round\.[\w]+\.suit$/;
const SC_PARAM_RANK = /^G\.GAME\.current_round\.[\w]+\.(rank|id)$/;
const SUIT_LABEL = { S: '黑桃', H: '红桃', D: '方片', C: '梅花' };

/** 这张牌要改的动态值（路径 + 类型 + 说明），排除已经在"整体修改"里的全局字段 */
function scJokerParams (j) {
  const meta = JOKER_STATE.jokers[j.name] || {};
  const out = [];
  for (const raw of (meta.external || [])) {
    const p = String(raw).replace(/^#\s*/, '').trim();
    if (!/^G\.GAME\./.test(p)) continue;
    if (/probabilities|buffer|STOP_USE|ecto_minus|used_jokers/.test(p)) continue;
    if (/^G\.GAME\.(dollars|starting_deck_size|blind|hands\[|round_resets\.(hands|discards))$/.test(p)) continue;
    let type = 'num', label = '';
    if (SC_PARAM_SUIT.test(p)) { type = 'suit'; label = '指定花色（这张牌按它判）' }
    else if (SC_PARAM_RANK.test(p)) { type = 'rank'; label = '指定点数（这张牌按它判）' }
    else if (/consumeable_usage_total\.tarot$/.test(p)) label = '已用塔罗牌张数';
    else if (/consumeable_usage_total\.planet$/.test(p)) label = '已用星球牌张数';
    else if (/consumeable_usage_total\.spectral$/.test(p)) label = '已用幽灵牌张数';
    else if (/free_rerolls$/.test(p)) label = '免费重掷次数';
    else if (/played_this_round$/.test(p)) label = '本回合打过几次';
    else if (/\.played$/.test(p)) label = '这个牌型打过几次';
    else if (/\.level$/.test(p)) label = '指定牌型的等级';
    else continue;
    if (!out.some((o) => o.path === p)) out.push({ path: p, type: type, label: label || p });
  }
  return out;
}

/** 把条件/表达式里这些路径换成玩家选的值（花色加引号、点数转成 id、数字直接写） */
function scSubstParams (txt, j) {
  let s = String(txt == null ? '' : txt);
  const p = (j && j.params) || {};
  for (const path in p) {
    const v = p[path];
    if (v === undefined || v === null || v === '') continue;
    const re = new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    let lit;
    if (SC_PARAM_SUIT.test(path)) lit = '"' + v + '"';
    else if (SC_PARAM_RANK.test(path)) lit = String(/\.id$/.test(path) ? (RANK_ID[v] || v) : v);
    else lit = String(v);
    s = s.replace(re, lit);
  }
  return s;
}

/* 局面字段 ←→ 源码里的写法：只被一张牌用到的，就放到那张牌的弹窗里改 */
const SC_ENV_PATHS = [
  [/^G\.GAME\.consumeable_usage_total\.tarot$/, 'tarotUsed', '已用塔罗牌'],
  [/^G\.GAME\.consumeable_usage_total\.planet$/, 'planetUsed', '已用星球牌'],
  [/^G\.GAME\.consumeable_usage_total\.spectral$/, 'spectralUsed', '已用幽灵牌'],
  [/^G\.GAME\.round_resets\.hands$/, 'roundHands', '每回合出牌数'],
  [/^G\.GAME\.round_resets\.discards$/, 'roundDiscards', '每回合弃牌数'],
  [/^G\.GAME\.current_round\.free_rerolls$/, 'freeRerolls', '免费重掷次数'],
];

/** 这张小丑牌单独用到的局面字段（原版里只有它会读的那些） */
function scJokerEnvFieldsOld (j) {
  const ext = (JOKER_STATE.jokers[j.name] || {}).external || [];
  const out = [];
  for (const raw of ext) {
    const p = String(raw).replace(/^#\s*/, '').trim();
    for (const [re, key, label] of SC_ENV_PATHS) {
      if (re.test(p) && !SC_ENV_FIELDS.some((f) => f[0] === key) && !out.some((o) => o[0] === key)) out.push([key, label]);
    }
  }
  return out;
}

/** 小丑牌弹窗里"这张牌要改的动态值"：花色 / 点数 / 数字，各用各的控件 */
function jenvHtml (j) { return '' }

/** 旧版：它单独用到的局面数值 */
function jenvHtmlOld (j) {
  const list = scJokerEnvFields(j);
  if (!list.length) return '';
  return '<div class="scgrowbox"><div class="scgrowtitle">这张牌单独用到的局面数值（原版里只有它读这些）</div><div class="scgrowfs">' +
    list.map(([k, label]) => '<label class="scgrowf"><span>' + label + '</span>' +
      '<input type="number" data-jenv="' + k + '" value="' + (SC.env[k] || 0) + '"></label>').join('') +
    '</div></div>';
}

/* ---- 小丑牌记录值的中文名（字段名来自游戏源码，名字是给人看的） ---- */
const SC_FIELD_LABEL = {
  mult: '累计倍率（每达成一次 +N）',
  x_mult: '累计倍数',
  chips: '累计筹码',
  'extra.chips': '累计筹码',
  'extra.dollars': '累计金钱',
  'extra_value': '已增加的售价',
  extra: '剩余次数',
  'extra.h_size': '减少的手牌上限',
  stone_tally: '牌组里的石头牌张数',
  steel_tally: '牌组里的钢铁牌张数',
  nine_tally: '本局打出的 9 的张数',
  driver_tally: '打出的 6/7/8 张数',
  perish_tally: '已经过的回合数',
  yorick_discards: '已弃牌张数',
  invis_rounds: '已经过的回合数',
  loyalty_remaining: '还差几手牌',
  hands_played_at_create: '入手时已出牌次数',
  burnt_hand: '本回合已出牌次数',
  money: '卖出时持有金钱',
  caino_xmult: '累计倍数',
  wheel_flipped: '命运之轮翻面次数',
  'extra.mult': '累计倍率',
  'extra.x_mult': '累计倍数',
  perishable: '剩余回合数',
};
const scFieldLabel = (f) => SC_FIELD_LABEL[f] || ('记录值 ' + f);
/** 哪些字段是"选牌型"而不是数字（To Do List 要指定一个牌型） */
const SC_FIELD_HAND = new Set(['to_do_poker_hand']);

/** 小丑牌的中文名（图鉴里本地化过的名字，mod 条目也一样） */
function scJokerName (j) {
  const it = j && BY_ID[j.id];
  return (it && nm(it)) || (j && j.name) || (j && j.id) || '';
}

/** 一张牌的短名字：K♠ / K♠ 钢铁牌（强化名走本地化，mod 条目也一样） */
function scCardLabel (c) {
  if (!c) return '';
  return (c.rank === '10' ? '10' : c.rank) + (SUIT_SYM[c.suit] || '') +
    (c.enh && BY_ID[c.enh] ? ' ' + nm(BY_ID[c.enh]) : '') +
    (c.ed && BY_ID[c.ed] ? ' · ' + nm(BY_ID[c.ed]) : '') +
    (c.seal ? ' · ' + c.seal + '蜡封' : '');
}

/** 一张小丑牌当前记录值的摘要（显示在卡图下面那行小字里） */
function scJokerStateText (j) {
  if (!j.fields || !j.fields.length) return '';
  const bits = [];
  for (const f of j.fields) {
    if (SC_FIELD_HAND.has(f)) { if (j.state[f]) bits.push(handCN(handByKey(j.state[f]))); continue }
    const v = j.state[f];
    if (!v) continue;
    bits.push(/^(x_mult|extra\.x_mult|caino_xmult)\$/.test(f) ? '×' + (+v).toFixed(2) : String(v) + (/(mult|chips|dollars)\$/.test(f) ? '' : ''));
  }
  return bits.length ? bits.join(' ') : '';
}

/** 触屏上没有右键：长按 480ms 等同于右键（PC 的右键 = 改这张牌 / 改这张小丑牌）。
 *  长按之后紧跟的那次 click 会被吞掉，免得顺带把这张牌又切换一次。 */
/** 长按之后浏览器会补一次 click（触屏上弹窗是底部整幅的，那一击往往落在遮罩上，
 *  刚打开的面板会被立刻关掉）。这里在捕获阶段吃掉紧接着的那一次点击。 */
function swallowNextClick () {
  const kill = (e) => { e.stopPropagation(); e.preventDefault(); cleanup() };
  const cleanup = () => { document.removeEventListener('click', kill, true); clearTimeout(timer) };
  const timer = setTimeout(cleanup, 800);
  document.addEventListener('click', kill, true);
}
function bindContext (el, handler) {
  el.oncontextmenu = (e) => { e.preventDefault(); handler(e) };
  let timer = null;
  const cancel = () => { if (timer) { clearTimeout(timer); timer = null } };
  el.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return cancel();
    const t = e.touches[0];
    cancel();
    timer = setTimeout(() => {
      timer = null;
      el.__lpAt = Date.now();
      if (navigator.vibrate) { try { navigator.vibrate(12) } catch (err) { /* ignore */ } }
      swallowNextClick();
      handler({ clientX: t.clientX, clientY: t.clientY });
    }, 480);
  }, { passive: true });
  el.addEventListener('touchmove', cancel, { passive: true });
  el.addEventListener('touchcancel', cancel, { passive: true });
  el.addEventListener('touchend', (e) => { cancel(); if (el.__lpAt && Date.now() - el.__lpAt < 900) { el.__lpAt = 0; if (e.cancelable) e.preventDefault() } });
}
/** 长按之后的 900ms 里，点击不算数（否则长按开面板的同时又切了一次牌） */
function lpSwallow (el) { return el.__lpAt && Date.now() - el.__lpAt < 900 }

/** 一排小按钮：◀ ▶ 挪位置、⧉ 复制一张、✕ 移除（小丑牌与扑克牌共用） */
function scTileActions (kind, arr, i, dup) {
  const mv = document.createElement('span');
  /* 第一张 / 最后一张的按钮条贴边，免得伸出栏外看不见 */
  mv.className = 'scmv' + (i === 0 ? ' atstart' : '') + (i === arr.length - 1 ? ' atend' : '');
  const btn = (dir, label, title) => '<button data-mv="' + i + '" data-mvkind="' + kind + '" data-dir="' + dir + '" title="' + title + '">' + label + '</button>';
  mv.innerHTML =
    (i > 0 ? btn('-1', '◀', '往前挪（左）') : '') +
    (i < arr.length - 1 ? btn('1', '▶', '往后挪（右）') : '') +
    btn('dup', '⧉', '复制一张') +
    btn('del', '✕', '移除这张');
  return mv;
}

/** 小丑牌：就地复制一张（插在它后面） */
function scDupJoker (j) {
  const i = SC.jokers.indexOf(j);
  if (i < 0) return;
  const c = jokerFromItem(BY_ID[j.id]);
  c.ed = j.ed;
  c.state = Object.assign({}, j.state);
  SC.jokers.splice(i + 1, 0, c);
}

/** 扑克牌：就地复制一张（留在同一侧、插在它后面） */
function scDupCard (c) {
  const copy = scCard(c.rank, c.suit, c.enh, c.ed, c.seal);
  const oi = SC_UI.order.indexOf(c);
  if (oi >= 0) SC_UI.order.splice(oi + 1, 0, copy);
  const pi = SC.played.indexOf(c);
  if (pi >= 0) { SC.played.splice(pi + 1, 0, copy); return }
  const hi = SC.held.indexOf(c);
  if (hi >= 0) SC.held.splice(hi + 1, 0, copy);
}

/* ---- 拖拽排序（游戏里牌的位置就是结算顺序，这里可以直接拖） ---- */
const SC_DRAG = { kind: null, ref: null, from: -1 };
function scDragStart (kind, ref, i) { return (e) => { SC_DRAG.kind = kind; SC_DRAG.ref = ref; SC_DRAG.from = i; e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', String(i)) } catch (err) { /* 老浏览器 */ } } }
function scDragOverTile (kind, ref) {
  return (e) => {
    if (SC_DRAG.kind !== kind || SC_DRAG.ref === ref) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const el = e.currentTarget;
    const before = e.clientX < el.getBoundingClientRect().left + el.getBoundingClientRect().width / 2;
    el.classList.toggle('dropbefore', before);
    el.classList.toggle('dropafter', !before);
  };
}
function scDragLeaveTile () { return (e) => { e.currentTarget.classList.remove('dropbefore', 'dropafter') } }
function scDropOnTile (kind, arr, ref) {
  return (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('dropbefore', 'dropafter');
    if (SC_DRAG.kind !== kind || !SC_DRAG.ref || SC_DRAG.ref === ref) return;
    const before = e.clientX < e.currentTarget.getBoundingClientRect().left + e.currentTarget.getBoundingClientRect().width / 2;
    const from = arr.indexOf(SC_DRAG.ref);
    if (from < 0) return;
    arr.splice(from, 1);
    let to = arr.indexOf(ref);
    if (to < 0) to = arr.length;
    arr.splice(before ? to : to + 1, 0, SC_DRAG.ref);
    if (kind === 'hand') SC_UI.order = arr.slice();       /* 手牌行自己维护顺序 */
    SC_DRAG.kind = null; SC_DRAG.ref = null;
    scStopPlay();
    render();
  }
}

/** 默认发 8 张普通牌（原版起手手牌上限就是 8）—— 不用一张一张加 */
function scDefaultHand (n) {
  const suits = ['S', 'H', 'D', 'C'];
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  SC.played = []; SC.held = []; SC_UI.order = [];
  for (let i = 0; i < (n || 8); i++) {
    const c = scCard(ranks[Math.floor(Math.random() * ranks.length)], suits[i % 4]);
    SC.held.push(c);
    SC_UI.order.push(c);
  }
  SC_UI.focus = null; SC_UI.edit = null; SC_UI.step = -1;
}

function viewScore (host) {
  /* 第一次进来桌上是空的：按原版起手的 8 张先发一手，省得一张一张加 */
  if (!SC.played.length && !SC.held.length && !SC_UI.order.length && !SC.jokers.length && !SC_UI.welcomed) {
    SC_UI.welcomed = true;
    scDefaultHand(8);
  }
  scSyncHand();                       /* 牌型跟着打出的牌走（手动指定过就不动） */
  const r = scoreCompute();
  const step = (SC_UI.step >= 0 && SC_UI.step < r.rows.length) ? SC_UI.step : -1;
  const shown = step >= 0 ? r.rows[step] : { chips: r.chips, mult: r.mult };
  const active = step >= 0 ? r.rows[step].ref : null;
  /* 这一步之前处理过的牌算「已结算」，之后的算「还没轮到」 */
  const reached = (kind, i) => {
    if (step < 0) return true;
    for (let k = 0; k <= step; k++) {
      const ref = r.rows[k].ref;
      if (ref && ref.kind === kind && ref.i === i) return true;
    }
    return false;
  };
  scOrderSync();
  const order = SC_UI.order;
  /* 行距照原版的 CardArea:align_cards 算：
       手牌区宽 6*CARD_W，pitch = (12.2927-2.049)/(max(n,8)-1)
       打出区固定 5 格，pitch = (10.8585-2.049)/4
       小丑牌 n>=3 铺满 4.9*CARD_W，pitch = 7.990244/(n-1)（n=2 时是它的一半）
     1 游戏单位 = 73 设计像素 = 34.65 CSS 像素（本站一张牌 71px = 游戏里 149.6px）。 */
  const GU = 34.65;
  const handPitch = (n) => (12.2927 - 2.049) / (Math.max(n, 8) - 1) * GU;
  const jokerPitch = (n) => n <= 1 ? 0 : (n === 2 ? 3.9951 : 7.990244 / (n - 1)) * GU;
  const PLAY_PITCH = (10.8585 - 2.049) / 4 * GU;
  const CARDW = 71;
  const cardLabel = (c) => (c.rank === '10' ? '10' : c.rank) + (SUIT_SYM[c.suit] || '') + (c.enh && BY_ID[c.enh] ? ' ' + (BY_ID[c.enh].name || '') : '');
  const refOf = (c) => {
    const i = SC.played.indexOf(c);
    if (i >= 0) return { kind: 'played', i };
    const k = SC.held.indexOf(c);
    return k >= 0 ? { kind: 'held', i: k } : null;
  };
  const isActive = (c) => { const rf = refOf(c); return !!(rf && active && rf.kind === active.kind && rf.i === active.i) };
  const isTodo = (c) => { const rf = refOf(c); return !!(rf && step >= 0 && !reached(rf.kind, rf.i)) };

  const head = document.createElement('div');
  head.className = 'listhead';
  head.innerHTML = '<h2>得分计算器</h2><span class="sub">结算顺序照游戏的 <code>evaluate_play</code>：牌型 → 每张打出的牌 → 留手 → 小丑（自左向右）→ 底注。' +
    '点手牌上的一张 = 原版里「选中」它（牌会原地抬起），点第二下就是留在手里。</span>';
  host.appendChild(head);

  const stage = document.createElement('div');
  stage.className = 'scstage';
  stage.innerHTML = `
    <div class="scgrid">
      <div class="schud">
        <div class="schandname"><b>${handCN(r.hand)}</b><i>Lv.${SC.level}</i>
          <em>${SC.played.length ? '由打出的牌自动判定' : '还没选牌'}　·　基础 ${r.hand.chips} × ${r.hand.mult}${SC.handMode === 'manual' ? '　·　手动指定' : ''}　·　本局打过 ${handPlayCount(SC.hand)} 次</em></div>
        <div class="scmath">
          <div class="scchips" title="筹码"><b>${Math.round(shown.chips)}</b></div>
          <div class="scx">X</div>
          <div class="scmult" title="倍率"><b>${+shown.mult.toFixed(2)}</b></div>
          <div class="scscore"><span>得分</span><b>${Math.floor(shown.chips * shown.mult).toLocaleString()}</b></div>
        </div>
        <div class="scnote" id="scNote"></div>
      </div>
      <div class="scrowbox">
        <div class="scrowhead"><span>小丑牌</span><em>自左向右结算 · 点一张改它的记录值 · 可以拖动换顺序</em>
          <button class="btn" id="scAddJoker">＋ 加小丑牌</button></div>
        <div class="scrail joks" id="scJokers"></div>
      </div>
      <div class="scrowbox scfull">
        <div class="scrowhead"><span>打出的牌</span><em id="scPlayedNote"></em></div>
        <div class="scrail plays" id="scPlayed"></div>
      </div>
      <div class="scrowbox scfull">
        <div class="scrowhead"><span>手牌</span><em>点一下 = 打出去，再点一下 = 留在手里（右键 / 长按改牌，可以拖动换位置）</em>
          <button class="btn primary" id="scAddCard">＋ 加牌</button>
          <button class="btn" id="scDeal" title="按原版起手的 8 张随机发一手">发 8 张</button>
          <select class="scsel" id="scPreset" title="一键摆好一个常见局面">
            <option value="">示例…</option>
            ${Object.keys(SC_PRESETS).map((k) => `<option value="${k}">${k}</option>`).join('')}
          </select>
          <button class="btn" id="scHandMode" title="紧凑 = 原版那种弧形（会互相压住左上角）；宽松 = 每张牌留出完整间距，点数花色全都看得见">手牌：紧凑弧</button>
          <button class="btn orange" id="scClear">清空</button>
        </div>
        <div class="scrail" id="scHand"></div>
      </div>
      <div class="scrowbox scfull">
        <div class="scblindbox">${scBlindBoxHtml()}</div>
        <div class="scrowhead"><span>整体修改</span><em>牌型等级与次数、以及原版算分读到的那些数值：剩余次数、金钱、牌堆、已用塔罗牌…（改这里，依赖它们的牌才算得对）</em>
          <button class="btn" id="scPlaysToggle">牌型次数…</button></div>
        <div class="scenv">
          <label class="scev" title="牌型等级（每级加多少见 HUD 那行）"><span>牌型等级 Lv</span><input id="scLevel" type="number" min="1" max="99" value="${SC.level}"></label>
          <label class="scev" title="本局用这个牌型打过几次（G.GAME.hands[x].played）"><span>本牌型已打次数</span><input id="scHandPlays" type="number" min="0" max="999" value="${handPlayCount(SC.hand)}"></label>
          <label class="scev scsel2" title="正常按打出的牌自动判定；只有 mod 改了牌型规则时才需要手动指定"><span>牌型（自动）</span>
            <select id="scHandType"><option value="">自动：${handCN(r.hand)}</option>${D.hands.slice().sort((a, b) => (b.order || 0) - (a.order || 0)).map((h) => `<option value="${h.name}"${SC.handMode === 'manual' && h.name === SC.hand ? ' selected' : ''}>${handLabel(h)}</option>`).join('')}</select>
          </label>
          ${SC_ENV_FIELDS.map(([k, label, min, max]) => `<label class="scev" title="${label}"><span>${label}</span><input type="number" data-env="${k}" min="${min}" max="${max}" value="${SC.env[k]}"></label>`).join('')}
          <label class="scevc"><input type="checkbox" data-envflag="blindDisabled"${SC.env.blindDisabled ? ' checked' : ''}><span>盲注被禁用</span></label>
        </div>
        <div class="scplays" id="scPlays" hidden>
          ${D.hands.map((h) => `<label class="scev" title="本局用「${handCN(h)}」打出过几次（G.GAME.hands[x].played）"><span>${handCN(h)}</span><input type="number" min="0" max="999" data-play="${h.name}" value="${handPlayCount(h.name)}"></label>`).join('')}
        </div>
      </div>
    </div>`;
  host.appendChild(stage);

  /* ---- 小丑牌行（原版在顶部一排，自左向右结算） ---- */
  const railJ = stage.querySelector('#scJokers');
  if (!SC.jokers.length) {
    railJ.appendChild(Object.assign(document.createElement('div'), { className: 'scempty', textContent: '还没有小丑牌——点右上角「＋ 加小丑牌」，在图鉴网格里点几张就加几张。' }));
  }
  SC.jokers.forEach((j, i) => {
    const cls = 'scj' + (active && active.kind === 'joker' && active.i === i ? ' on' : (step >= 0 && !reached('joker', i) ? ' todo' : '')) +
      (SC_UI.joker === j ? ' focus' : '');
    const st = scJokerStateText(j);
    const t0 = scoreJokerCanvas(j, 1);
    const t = spriteTile(t0, cls, scJokerName(j) + '　·　第 ' + (i + 1) + ' 个结算' + (st ? '　·　记录值 ' + st : '') +
      '\n点一下改它的记录值 · 拖动可以换结算顺序');
    t.style.zIndex = String(100 - i);
    t.style.marginRight = (i === SC.jokers.length - 1 ? 0 : jokerPitch(SC.jokers.length) - CARDW) + 'px';
    const badge = document.createElement('i');
    badge.className = 'scbadge';
    badge.textContent = scJokerName(j) + (st ? ' · ' + st : '');
    t.dataset.sig = scCardSig({ rank: '', suit: '' }, 1);   /* 小丑不参与卡牌规格对比 */
    t.appendChild(badge);
    /* 记录值有数就挂个小角标，一眼看出这张牌被填过 */
    if (st) t.appendChild(Object.assign(document.createElement('i'), { className: 'scgrow', textContent: st }));
    t.appendChild(scTileActions('joker', SC.jokers, i, scDupJoker));
    /* 拖动换结算顺序（原版里小丑牌的位置就是结算顺序，拖比按按钮直观） */
    t.draggable = true;
    t.addEventListener('dragstart', scDragStart('joker', j, i));
    t.addEventListener('dragover', scDragOverTile('joker', j));
    t.addEventListener('dragleave', scDragLeaveTile());
    t.addEventListener('drop', scDropOnTile('joker', SC.jokers, j));
    t.onclick = (e) => { if (e.target.closest('.scmv')) return; scOpenJokerEditor(j); render() };
    railJ.appendChild(t);
  });

  /* ---- 打出的牌（原版里按下「打出」之后牌飞到中间的那一排） ---- */
  const railP = stage.querySelector('#scPlayed');
  const pn = stage.querySelector('#scPlayedNote');
  pn.textContent = SC.played.length
    ? SC.played.length + ' 张：' + SC.played.map(cardLabel).join('、')
    : '还没选牌——在手牌里点几张就是「打出去」。';
  if (!SC.played.length) {
    railP.appendChild(Object.assign(document.createElement('div'), { className: 'scempty', textContent: '（空）' }));
  }
  SC.played.forEach((c, i) => {
    const cls = 'scc' + (active && active.kind === 'played' && active.i === i ? ' on' : (step >= 0 && !reached('played', i) ? ' todo' : ''));
    const t = spriteTile(scoreCardCanvas(c, 1), cls, cardLabel(c) + '　·　点一下改回留手，右键 / 长按改牌');
    t.__card = c;                       /* 记住代表哪张牌：改完就地重画它，不用等整页 render */
    t.style.zIndex = String(100 - i);
    t.style.marginRight = (i === SC.played.length - 1 ? 0 : PLAY_PITCH - CARDW) + 'px';
    if (c.seal === 'Red') t.appendChild(Object.assign(document.createElement('i'), { className: 'scred', textContent: '红' }));
    t.onclick = () => { if (lpSwallow(t)) return; scStopPlay(); scToggleCard(c); render() };
    bindContext(t, () => { scOpenCardEditor(c); render() });
    railP.appendChild(t);
  });

  /* ---- 手牌（原版最下面那一排；点一下就是原版的「选中」） ---- */
  const railH = stage.querySelector('#scHand');
  if (SC_UI.handWide) railH.classList.add('wide');
  { const hm = host.querySelector('#scHandMode'); if (hm) hm.textContent = SC_UI.handWide ? '手牌：宽松' : '手牌：紧凑弧' }
  if (!order.length) {
    railH.appendChild(Object.assign(document.createElement('div'), { className: 'scempty', textContent: '手牌是空的——「＋ 加牌」从图鉴里挑，或者「发 8 张」按原版起手发一手。' }));
  }
  order.forEach((c, i) => {
    const sel = scIsPlayed(c);
    const cls = 'scc' + (sel ? ' sel' : '') + (isActive(c) ? ' on' : (isTodo(c) ? ' todo' : ''));
    const t = spriteTile(scoreCardCanvas(c, 1), cls, cardLabel(c) + (sel ? '　·　打出去' : '　·　留在手里') + '（点一下切换，右键 / 长按改牌，可以拖动）');
    t.__card = c;
    t.style.zIndex = String(100 - i);
    t.style.marginRight = (i === order.length - 1 ? 0 : handPitch(order.length) - CARDW) + 'px';
    /* 原版手牌是弧形（CardArea:align_cards）：角度 ±0.2*(k-n/2-0.5)/n，
       两端按 |0.5*(-n/2+k-0.5)/n| 下沉一点，中间最高。 */
    const n2 = order.length;
    const kk = i + 1;
    const ar = 0.2 * (kk - n2 / 2 - 0.5) / n2 * 57.2958;
    const ay = Math.abs(0.5 * (-n2 / 2 + kk - 0.5) / n2) * 34.65;
    t.style.setProperty('--ar', ar.toFixed(2) + 'deg');
    t.style.setProperty('--ay', ay.toFixed(1) + 'px');
    if (c.seal === 'Red') t.appendChild(Object.assign(document.createElement('i'), { className: 'scred', textContent: '红' }));
    t.appendChild(scTileActions('hand', order, i));
    t.draggable = true;
    t.addEventListener('dragstart', scDragStart('hand', c, i));
    t.addEventListener('dragover', scDragOverTile('hand', c));
    t.addEventListener('dragleave', scDragLeaveTile());
    t.addEventListener('drop', scDropOnTile('hand', order, c));
    t.onclick = () => { if (lpSwallow(t)) return; scStopPlay(); scToggleCard(c); render() };
    bindContext(t, () => { scOpenCardEditor(c); render() });
    railH.appendChild(t);
  });

  /* ---- HUD 下面那行读数：留手在算什么 / 手填修正 ---- */
  const note = stage.querySelector('#scNote');
  const heldTxt = SC.held.length ? '留手 ' + SC.held.length + ' 张：' + SC.held.map(cardLabel).join('、') : '留手 0 张';
  const steel = SC.held.filter((c) => c.enh && (c.enh === 'm_steel' || /steel/i.test(c.enh))).length;
  const manual = (SC.manual.chips || SC.manual.mult || (SC.manual.xmult && SC.manual.xmult !== 1))
    ? '　·　手填 +' + SC.manual.chips + ' 筹码 / +' + SC.manual.mult + ' 倍率 / ×' + SC.manual.xmult : '';
  note.innerHTML = heldTxt + (steel ? '　·　<b>钢铁牌 ' + steel + ' 张（每张 ×1.5）</b>' : '') + manual;

  /* 改牌 / 改小丑牌都走弹窗（scOpenCardEditor / scOpenJokerEditor），不再挤在页面下方 —— 想改
     哪张就点哪张，弹窗自己滚，手机竖屏也够用。 */
  if (SC_UI.focus || SC_UI.joker) scSyncPanel();

  /* ---- 播放条：贴在窗口底部，播放时不用往回滚就能看到数字在变 ---- */
  const bar = document.createElement('div');
  bar.className = 'scplay';
  bar.innerHTML = `
    <span class="scplaymath" title="当前筹码 × 倍率 = 得分">
      <b class="scpchips">${Math.round(shown.chips)}</b><i>×</i><b class="scpmult">${+shown.mult.toFixed(2)}</b><i>=</i><b class="scpscore">${Math.floor(shown.chips * shown.mult).toLocaleString()}</b>
    </span>
    <button class="btn" id="scFirst" title="回到结果">⏮</button>
    <button class="btn" id="scPrev" title="上一步">◀</button>
    <button class="btn primary" id="scToggle">${SC_UI.playing ? '⏸ 暂停' : '▶ 逐步播放'}</button>
    <button class="btn" id="scNext" title="下一步">▶</button>
    <button class="btn" id="scLast" title="直接看结果">⏭</button>
    <input type="range" id="scStep" min="-1" max="${r.rows.length - 1}" value="${step}" title="结算进度">
    <span class="scstepn">${step < 0 ? '结果' : (step + 1) + ' / ' + r.rows.length}</span>
    <span class="scnow">${step < 0 ? '最终得分' : r.rows[step].label}</span>`;
  host.appendChild(bar);

  /* ---- 账目（点一行就跳到那一步） ---- */
  const log = document.createElement('details');
  log.className = 'sclog';
  log.open = step >= 0;
  log.innerHTML = '<summary>结算账目（' + r.rows.length + ' 步）</summary>' +
    r.rows.map((x, k) => `<div class="scline ${x.op}${k === step ? ' on' : ''}" data-step="${k}"><span>${x.label}</span><i>${Math.round(x.chips)} × ${+x.mult.toFixed(2)}</i></div>`).join('');
  host.appendChild(log);

  if (r.warns.length) {
    const w = document.createElement('div');
    w.className = 'scwarn';
    w.innerHTML = '<b>这些没自动算</b>（依赖运行时状态或条件无法判定）：' +
      r.warns.map((x) => `<div>· ${x.n} <em>${x.why}</em></div>`).join('');
    host.appendChild(w);
  }
  const foot = document.createElement('div');
  foot.className = 'scfoot';
  const nState = Object.keys(JOKER_STATE.jokers).length;
  foot.innerHTML = '规则取自游戏自己的 <code>card.lua</code>（<code>Card:calculate_joker</code>）：<b>' + (JOKER_RULES.rules || []).length +
    '</b> 条具名规则 + 4 条通用配置规则 + <b>' + Object.keys(SC_EXTRA_RULES).length + '</b> 条原版写在 update 里的手写补充（Joker Stencil 的空栏位、Blueprint 复制右边那张…）；' +
    '局面读的是 <code>gen-state.js</code> 从源码里扫出来的 <b>' + (JOKER_STATE.external || []).length + '</b> 个外部字段，' +
    '<b>' + nState + '</b> 张小丑牌有自己的累计值输入。<br>' +
    '仍然算不了的两类：① 概率类（幸运牌、8 球、骰子、血石…）；② 原版改的是别的东西的牌（金钱、手牌上限、生成消耗品、重触发这类）—— 它们在这张牌的「手填修正」里可以手动补。';
  host.appendChild(foot);

  /* ---- 事件 ---- */
  /* 注意：播放条挂在 host 上而不是 stage 里，所以这里从 host 找 */
  const q = (sel) => host.querySelector(sel);
  const stepTo = (v) => { SC_UI.step = Math.max(-1, Math.min(r.rows.length - 1, v)); render() };
  { const art = q('.scblindbox .scblindart'); if (art && SC.blind) scPaintBlindArt(art, scBlindItem(), 52) }
  q('.scblindpick').onclick = () => scBlindPicker();
  { const cx = q('.scblindclear'); if (cx) cx.onclick = () => { scStopPlay(); SC.blind = ''; SC_UI.step = -1; render() } }
  q('#scHandType').onchange = (e) => {
    scStopPlay();
    const v = e.target.value;
    if (v) { SC.handMode = 'manual'; SC.hand = v } else { SC.handMode = 'auto'; scSyncHand() }
    render();
  };
  q('#scHandPlays').oninput = (e) => {
    SC.env.played = SC.env.played || {};
    SC.env.played[SC.hand] = Number(e.target.value) || 0;
    scStopPlay(); SC_UI.step = -1; scRefreshNumbers(host);
  };
  q('#scLevel').oninput = (e) => {
    scStopPlay();
    SC.level = Math.max(1, Math.min(99, Number(e.target.value) || 1));
    SC_UI.step = -1;
    scRefreshNumbers(host);
    const lv = host.querySelector('.schandname i');
    if (lv) lv.textContent = 'Lv.' + SC.level;
    const bs = host.querySelector('.scbase');
    if (bs) { const h2 = handByKey(SC.hand); bs.textContent = '每级 +' + (h2.l_chips || 0) + ' / +' + (h2.l_mult || 0) }
    scRefreshTiles(host);
  };
  q('#scDeal').onclick = () => { scDefaultHand(8); render() };
  q('#scHandMode').onclick = () => { SC_UI.handWide = !SC_UI.handWide; render() };
  q('#scClear').onclick = () => { scStopPlay(); SC.played = []; SC.held = []; SC.jokers = []; SC_UI.order = []; SC_UI.focus = null; SC_UI.joker = null; SC_UI.step = -1; render() };
  q('#scAddCard').onclick = () => openScPicker('PlayingCard');
  q('#scAddJoker').onclick = () => openScPicker('Joker');
  q('#scPreset').onchange = (e) => { const v = e.target.value; if (v) scApplyPreset(v) };

  q('#scFirst').onclick = () => { scStopPlay(); stepTo(-1) };
  q('#scPrev').onclick = () => { scStopPlay(); stepTo(SC_UI.step < 0 ? r.rows.length - 2 : SC_UI.step - 1) };
  q('#scNext').onclick = () => { scStopPlay(); stepTo(SC_UI.step < 0 ? 0 : SC_UI.step + 1) };
  q('#scLast').onclick = () => { scStopPlay(); stepTo(r.rows.length - 1) };
  q('#scStep').oninput = (e) => { scStopPlay(); stepTo(+e.target.value) };
  q('#scToggle').onclick = () => {
    if (SC_UI.playing) { scStopPlay(); render(); return }
    SC_UI.playing = true;
    SC_UI.step = -1;
    render();
    { const b = host.querySelector('.scplay'); if (b && b.scrollIntoView) b.scrollIntoView({ block: 'nearest' }) }
    SC_UI.timer = setInterval(() => {
      const rr = scoreCompute();
      if (SC_UI.step >= rr.rows.length - 1) { scStopPlay(); render(); return }
      SC_UI.step += 1;
      render();
    }, 520);
  };
  log.addEventListener('click', (e) => {
    const row = e.target.closest('[data-step]');
    if (row) { scStopPlay(); stepTo(+row.dataset.step) }
  });
  stage.addEventListener('click', (e) => {
    const mv = e.target.closest('[data-mv]');
    if (mv) {
      const i = +mv.dataset.mv;
      const kind = mv.dataset.mvkind || 'joker';
      const arr = kind === 'hand' ? SC_UI.order : SC.jokers;
      const dir = mv.dataset.dir;
      if (dir === 'del') {
        if (kind === 'hand') scRemoveCard(arr[i]);
        else arr.splice(i, 1);
      } else if (dir === 'dup') {
        if (kind === 'hand') scDupCard(arr[i]);
        else scDupJoker(arr[i]);
      } else {
        const k = i + (+dir);
        if (k >= 0 && k < arr.length) { const t2 = arr[i]; arr[i] = arr[k]; arr[k] = t2 }
      }
      scStopPlay(); render(); return;
    }
    const pk = e.target.closest('[data-pick]');
    if (pk && SC_UI.focus) { SC_UI.focus[pk.dataset.pick] = pk.dataset.v; render(); return }
    if (e.target.id === 'scClose') { SC_UI.focus = null; render(); return }
    if (e.target.id === 'scDel' && SC_UI.focus) { scRemoveCard(SC_UI.focus); render(); return }
  });
  const dlg = host.querySelector('.scfocus');
  if (dlg) {
    dlg.addEventListener('contextmenu', (e) => e.preventDefault());
    dlg.addEventListener('click', (e) => {
      const pk = e.target.closest('[data-pick]');
      if (pk && SC_UI.focus) { SC_UI.focus[pk.dataset.pick] = pk.dataset.v; render(); return }
      if (e.target.id === 'scClose') { SC_UI.focus = null; render(); return }
      if (e.target.id === 'scDel' && SC_UI.focus) { scRemoveCard(SC_UI.focus); render(); return }
      if (e.target.id === 'scJokerClose') { SC_UI.joker = null; render(); return }
      if (e.target.id === 'scJokerDel') { const j = SC_UI.joker; SC_UI.joker = null; const i = SC.jokers.indexOf(j); if (i >= 0) SC.jokers.splice(i, 1); render(); return }
      if (e.target.id === 'scJokerCodex' && SC_UI.joker) { selectItem(SC_UI.joker.id, true); return }
    });
    /* 小丑牌的记录值：改一个字就重算（数值型） */
    dlg.addEventListener('input', (e) => {
      const j = SC_UI.joker;
      if (!j) return;
      const st = e.target.closest('[data-jstate]');
      if (st) {
        const f = st.dataset.jstate;
        j.state[f] = SC_FIELD_HAND.has(f) ? st.value : (Number(st.value) || 0);
        scStopPlay(); SC_UI.step = -1; render(); return;
      }
      const man = e.target.closest('[data-jman]');
      if (man) {
        j.manual[man.dataset.jman] = Number(man.value) || 0;
        scStopPlay(); SC_UI.step = -1; render();
      }
    });
    dlg.addEventListener('change', (e) => {
      const st = e.target.closest('[data-jstate]');
      if (st && SC_FIELD_HAND.has(st.dataset.jstate) && SC_UI.joker) { SC_UI.joker.state[st.dataset.jstate] = st.value; render() }
    });
  }
  /* 局面：每个数值一改就重算（Obelisk 看牌型次数、Blue Joker 看牌堆张数…） */
  stage.addEventListener('input', (e) => {
    const env = e.target.closest('[data-env]');
    if (env) { SC.env[env.dataset.env] = Number(env.value) || 0; scStopPlay(); SC_UI.step = -1; scRefreshNumbers(host); return }
    const pl = e.target.closest('[data-play]');
    if (pl) {
      SC.env.played = SC.env.played || {};
      SC.env.played[pl.dataset.play] = Number(pl.value) || 0;
      scStopPlay(); SC_UI.step = -1; scRefreshNumbers(host); return;
    }
    const flag = e.target.closest('[data-envflag]');
    if (flag) { SC.env[flag.dataset.envflag] = !!flag.checked; scStopPlay(); scRefreshNumbers(host) }
  });
  const playsBtn = q('#scPlaysToggle');
  if (playsBtn) playsBtn.onclick = () => { const el = stage.querySelector('#scPlays'); el.hidden = !el.hidden; playsBtn.textContent = el.hidden ? '牌型次数…' : '收起牌型次数' };
  /* 右键：浏览器菜单挡掉，用来改牌 */
  stage.addEventListener('contextmenu', (e) => { if (e.target.closest('.sctile')) e.preventDefault() });
}

/* ================================================================ 修改弹窗
 * 玩家的抱怨：改一张牌要滚到页面下面去找那一堆胶囊按钮。改成点一下就弹出来，
 * 弹窗自己滚；窄屏（手机竖屏）从底部弹出，占满宽度。 */

function scPanel (opts) {
  let root = document.getElementById('scPanel');
  if (!root) {
    root = document.createElement('div');
    root.id = 'scPanel';
    root.className = 'scpick scmodal';
    root.innerHTML = '<div class="scpickpanel"><div class="scpicktop"></div><div class="scpanelscroll"></div><div class="scpanelfoot"></div></div>';
    document.body.appendChild(root);
    root.addEventListener('click', (e) => {
      if (e.target === root || e.target.closest('#scPanelDone')) scClosePanel();
    });
  }
  const top = root.querySelector('.scpicktop');
  top.innerHTML = '<b>' + opts.title + '</b><span class="scpickhint">' + (opts.hint || '') + '</span>' +
    '<button class="btn primary" id="scPanelDone">完成 ✓</button>';
  root.querySelector('.scpanelscroll').innerHTML = opts.body || '';
  root.querySelector('.scpanelfoot').innerHTML = opts.foot || '';
  root.querySelector('.scpanelfoot').hidden = !opts.foot;
  root.classList.toggle('narrow', window.innerWidth < 700);
  return root;
}

function scClosePanel (keepSel) {
  const root = document.getElementById('scPanel');
  if (root) root.remove();
  if (!keepSel) { SC_UI.focus = null; SC_UI.joker = null }
}

/** 弹窗开着的时候编辑了一下：只把该变的地方就地更新，不重建 DOM、不重挂监听器 */
function scAfterEdit () {
  const root = document.getElementById('scPanel');
  const host = document.getElementById('content');
  if (root && SC_UI.focus) {
    const c = SC_UI.focus;
    /* 胶囊的选中态 */
    root.querySelectorAll('[data-pick]').forEach((b) => b.classList.toggle('on', (c[b.dataset.pick] || '') === b.dataset.v));
    /* 卡图：规格变了才重画 */
    const art = root.querySelector('.scmodalart');
    if (art) {
      const want = scCardSig(c, 2);
      if (art.dataset.sig !== want) { art.dataset.sig = want; art.innerHTML = ''; const cv = scoreCardCanvas(c, 2); if (cv) { cv.style.width = '71px'; cv.style.height = '95px'; art.appendChild(cv) } }
    }
    const hint = root.querySelector('.scpickhint');
    if (hint) hint.textContent = '点一下就是它现在的样子：' + scCardLabel(c);
  }
  if (host) scRefreshNumbers(host);
  if (host) scRefreshTiles(host);
}

/** 改小丑牌之后就地把弹窗与卡位刷新一遍（版本胶囊 / 记录值都用它） */
function scAfterEditJoker () {
  const root = document.getElementById('scPanel');
  const host = document.getElementById('content');
  const j = SC_UI.joker;
  if (root && j) {
    root.querySelectorAll('[data-pick]').forEach((b) => b.classList.toggle('on', (j[b.dataset.pick] || '') === b.dataset.v));
    const art = root.querySelector('.scmodalart');
    if (art) {
      const want = scJokerSig(j, 2);
      if (art.dataset.sig !== want) {
        art.dataset.sig = want; art.innerHTML = '';
        const cv = scoreJokerCanvas(j, 2);
        if (cv) { cv.style.width = '71px'; cv.style.height = '95px'; art.appendChild(cv) }
      }
    }
  }
  if (host) { scRefreshNumbers(host); scRefreshTiles(host) }
}

/** 只重画变掉的那些卡位（不动整页）—— 按引用找，之前用 data-sig 找、而卡位根本没写过这个属性，
 *  所以右键改完牌要点一下才刷新（这就是用户报的那个 bug）。 */
function scRefreshTiles (host) {
  if (SC_UI.focus && (SC.played.indexOf(SC_UI.focus) >= 0 || SC.held.indexOf(SC_UI.focus) >= 0)) {
    const c = SC_UI.focus;
    for (const t of host.querySelectorAll('.sctile')) {
      if (t.__card !== c) continue;
      const old = t.querySelector('canvas');
      const cv = scoreCardCanvas(c, 1);
      if (cv && old) t.replaceChild(cv, old);
      const b = t.querySelector('.scbadge');
      if (b) b.textContent = scCardLabel(c);
    }
  }
  if (SC_UI.joker) {
    const j = SC_UI.joker;
    const tiles = host.querySelectorAll('#scJokers .sctile');
    const idx = SC.jokers.indexOf(j);
    if (tiles[idx]) {
      const old = tiles[idx].querySelector('canvas');
      const cv = scoreJokerCanvas(j, 1);
      if (cv && old) tiles[idx].replaceChild(cv, old);
      const b = tiles[idx].querySelector('.scbadge');
      const st = scJokerStateText(j);
      if (b) b.textContent = scJokerName(j) + (st ? ' · ' + st : '');
    }
  }
}

/** 兼容旧调用：面板开着就就地刷新 */
function scSyncPanel () {
  if (document.getElementById('scPanel')) scAfterEdit();
}

function scPillGrid (label, list, cur, field) {
  return '<div class="scpkrow"><span>' + label + '</span>' +
    list.map((x) => '<button class="scpk' + (x[0] === cur ? ' on' : '') + '" data-pick="' + field + '" data-v="' + esc(x[0]) + '" title="' + esc(x[0] || '无') + '">' + esc(x[1]) + '</button>').join('') +
    '</div>';
}

/** 改一张扑克牌：点数 / 花色 / 强化 / 版本 / 蜡封 —— 名字全部走本地化（mod 条目也一样） */
function scOpenCardEditor (c, keep) {
  if (!keep) scStopPlay();
  SC_UI.focus = c; SC_UI.joker = null;
  const ranks = Object.keys(RANK_CHIPS).map((k) => [k, k]);
  const suits = Object.keys(SUIT_SYM).map((k) => [k, SUIT_SYM[k]]);
  const enhs = [['', '无']].concat(ITEMS.filter((x) => x.cat === 'Enhancement').map((x) => [x.id, nm(x)]));
  const eds = [['', '无']].concat(ITEMS.filter((x) => x.cat === 'Edition' && !x.shader).map((x) => [x.id, nm(x)]));
  const seals = [['', '无'], ['Red', '红蜡封'], ['Gold', '金蜡封'], ['Blue', '蓝蜡封'], ['Purple', '紫蜡封']];
  const cv = scoreCardCanvas(c, 2);
  /* 右侧图鉴直接跟着这张牌走，不用再点一次"在图鉴里看" */
  try { S.sel = c.suit + '_' + (c.rank === '10' ? 'T' : c.rank); renderDetail() } catch (e) { /* 图鉴还没起来就算了 */ }
  scPanel({
    title: '改这张牌',
    hint: '点一下就是它现在的样子：' + scCardLabel(c),
    body: '<div class="scmodalcard">' + (cv ? '<span class="scmodalart"></span>' : '') +
      '<div class="scpkrows">' +
      scPillGrid('点数', ranks, c.rank, 'rank') + scPillGrid('花色', suits, c.suit, 'suit') +
      scPillGrid('削弱', [['', '正常'], ['1', '被削弱（不参与算分）']], c.debuff ? '1' : '', 'debuff') +
      scPillGrid('强化', enhs, c.enh, 'enh') + scPillGrid('版本', eds, c.ed, 'ed') +
      scPillGrid('蜡封', seals, c.seal, 'seal') +
      '</div></div>',
    foot: '<button class="btn" id="scCardCodex" title="在图鉴里看这张牌的原始数据">在图鉴里看</button>' +
      '<button class="btn warn" id="scCardDel">移除这张牌</button>' +
      '<span class="scfoothint">想改成"留手"就把弹窗关掉、点一下这张牌。</span>',
  });
  const root = document.getElementById('scPanel');
  if (cv) { const art = root.querySelector('.scmodalart'); if (art) { cv.style.width = '71px'; cv.style.height = '95px'; art.appendChild(cv) } }
  /* 注意：容器元素是复用的，这里必须用属性式 handler —— 用 addEventListener 的话
     每编辑一次就多挂一个，点快了会成倍重入（这就是之前卡死的原因）。 */
  const scroll = root.querySelector('.scpanelscroll');
  const foot = root.querySelector('.scpanelfoot');
  scroll.onclick = (e) => {
    const pk = e.target.closest('[data-pick]');
    if (pk && SC_UI.focus) { SC_UI.focus[pk.dataset.pick] = pk.dataset.v; scAfterEdit(); return }
  };
  scroll.oninput = null; scroll.onchange = null;
  foot.onclick = (e) => {
    if (e.target.id === 'scCardDel') { const cc = SC_UI.focus; scClosePanel(); scRemoveCard(cc); render(); return }
    if (e.target.id === 'scCardCodex' && SC_UI.focus) {
      const id = SC_UI.focus.suit + '_' + (SC_UI.focus.rank === '10' ? 'T' : SC_UI.focus.rank);
      scClosePanel(); selectItem(id, true);
    }
  };
}

/** 「记录值」只列游戏源码里真的会累加 / 递减的字段。
 *  从规则表达式猜出来的那些（古老小丑的 extra 之类）其实是配置参数：描述里已经给了就地控件，
 *  再在弹窗里列一行「剩余次数」只会让人看不懂。 */
function scIsRecordField (j, f) {
  const scanned = ((JOKER_STATE.jokers || {})[j.name] || {}).mutable || [];
  if (scanned.indexOf(f) >= 0) return true;
  if (scanned.length) return false;                       /* 源码扫到过这张牌：只信扫出来的 */
  const top = String(f).split('.')[0];
  return typeof (j.cfg || {})[top] !== 'number';           /* mod 的牌：配置里写死的参数不算记录值 */
}

/** 改一张小丑牌：记录值（原版里它自己累计的数）+ 手填修正 */
function scOpenJokerEditor (j, keep) {
  if (!keep) scStopPlay();
  SC_UI.joker = j; SC_UI.focus = null;
  const idx = SC.jokers.indexOf(j);
  const rule = jokerRule(j);
  const fields = (j.fields || []).filter((f) => scIsRecordField(j, f));
  const meta = JOKER_STATE.jokers[j.name] || {};
  const fieldInput = (f) => {
    if (SC_FIELD_HAND.has(f)) {
      return '<label class="scgrowf"><span>' + scFieldLabel(f) + '</span><select data-jstate="' + f + '">' +
        '<option value="">（未指定）</option>' +
        D.hands.map((h) => '<option value="' + h.name + '"' + (j.state[f] === h.name ? ' selected' : '') + '>' + handCN(h) + '</option>').join('') +
        '</select></label>';
    }
    const v = typeof j.state[f] === 'number' ? j.state[f] : 0;
    return '<label class="scgrowf"><span>' + scFieldLabel(f) + '</span>' +
      '<input type="number" step="0.5" data-jstate="' + f + '" value="' + v + '">' +
      '<em>' + esc(f) + '</em></label>';
  };
  const cv = scoreJokerCanvas(j, 2);
  try { S.sel = j.id; renderDetail() } catch (e) { /* ignore */ }
  scPanel({
    title: esc(scJokerName(j)),
    hint: '第 ' + (idx + 1) + ' 个结算　·　' +
      (rule ? (rule.k === 'yes' ? '规则可自动判定' : rule.k === 'manual' ? '条件要靠记录值 / 手填' : rule.k === 'by-card' ? '按打出的每张牌判定' : '增加重复次数') : '没有自动规则，只能手填') +
      (meta.external && meta.external.length ? '　·　它还会读局面：' + meta.external.slice(0, 3).join('、') : ''),
    body: '<div class="scmodalcard">' + (cv ? '<span class="scmodalart"></span>' : '') +
      '<div class="scpkrows">' +

      '<div class="scgrowbox"><div class="scgrowtitle">这张牌是否被禁用（被禁用的小丑牌完全不参与算分 —— BOSS 盲注点名禁用时用这个）</div>' +
      scPillGrid('禁用', [['', '正常'], ['1', '被禁用']], j.debuff ? '1' : '', 'debuff') +
      '</div>' +
      '<div class="scgrowbox"><div class="scgrowtitle">版本（影响这张牌的结算：闪箔 +50 筹码 / 镭射 +10 倍率 / 多彩 ×1.5 / 负片）</div>' +
      scPillGrid('版本', [['', '无']].concat(ITEMS.filter((x) => x.cat === 'Edition' && !x.shader).map((x) => [x.id, nm(x)])), j.ed, 'ed') +
      '</div>' +
      (fields.length
        ? '<div class="scgrowbox"><div class="scgrowtitle">记录值（原版里这张牌自己累计的数，填了它才算得对）</div><div class="scgrowfs">' + fields.map(fieldInput).join('') + '</div></div>'
        : '<div class="scgrowbox"><div class="scgrowtitle">这张牌没有累计值 —— 它只看牌型、你选的牌和上面那些数</div></div>') +
      '<div class="scgrowbox"><div class="scgrowtitle">描述（里面的动态值可以直接改）</div>' + scJokerDescHtml(j) + '</div>' +
      jenvHtml(j) + '</div></div>',
    foot: '<button class="btn" id="scJokerCodex" title="在图鉴里看它的完整数据">在图鉴里看</button>' +
      '<button class="btn warn" id="scJokerDel">移除这张小丑牌</button>',
  });
  const root = document.getElementById('scPanel');
  if (cv) { const art = root.querySelector('.scmodalart'); if (art) { cv.style.width = '71px'; cv.style.height = '95px'; art.appendChild(cv) } }
  const scroll = root.querySelector('.scpanelscroll');
  const foot = root.querySelector('.scpanelfoot');
  scroll.onclick = (e) => {
    const pk = e.target.closest('[data-pick]');
    if (pk && SC_UI.joker) { SC_UI.joker[pk.dataset.pick] = pk.dataset.v; scAfterEditJoker(); return }
  };
  scroll.oninput = (e) => {
    const jj = SC_UI.joker;
    if (!jj) return;
    const st = e.target.closest('[data-jstate]');
    if (st) {
      const f = st.dataset.jstate;
      jj.state[f] = SC_FIELD_HAND.has(f) ? st.value : (Number(st.value) || 0);
      scStopPlay(); SC_UI.step = -1; scAfterEdit(); return;
    }
    const pr = e.target.closest('[data-jparam]');
    if (pr) {
      const jj2 = SC_UI.joker;
      if (jj2) { jj2.params = jj2.params || {}; jj2.params[pr.dataset.jparam] = pr.value; scStopPlay(); SC_UI.step = -1; render() }
      return;
    }
    const ev = e.target.closest('[data-jenv]');
    if (ev) { SC.env[ev.dataset.jenv] = Number(ev.value) || 0; scStopPlay(); SC_UI.step = -1; scRefreshNumbers(document.getElementById('content')); return }
  };
  scroll.onchange = (e) => {
    const pr2 = e.target.closest('[data-jparam]');
    if (pr2 && SC_UI.joker) { SC_UI.joker.params = SC_UI.joker.params || {}; SC_UI.joker.params[pr2.dataset.jparam] = pr2.value; scStopPlay(); SC_UI.step = -1; render(); return }
    const st = e.target.closest('[data-jstate]');
    if (st && SC_FIELD_HAND.has(st.dataset.jstate) && SC_UI.joker) { SC_UI.joker.state[st.dataset.jstate] = st.value; scAfterEdit() }
  };
  foot.onclick = (e) => {
    if (e.target.id === 'scJokerDel') {
      const jj = SC_UI.joker;
      scClosePanel();
      const i = SC.jokers.indexOf(jj);
      if (i >= 0) SC.jokers.splice(i, 1);
      render(); return;
    }
    if (e.target.id === 'scJokerCodex' && SC_UI.joker) { const id = SC_UI.joker.id; scClosePanel(); selectItem(id, true) }
  };
}

/** 只把数字重算一遍（局面输入框在打字时不要整页重建，否则光标会跳） */
function scRefreshNumbers (host) {
  const r = scoreCompute();
  const step = (SC_UI.step >= 0 && SC_UI.step < r.rows.length) ? SC_UI.step : -1;
  const shown = step >= 0 ? r.rows[step] : { chips: r.chips, mult: r.mult };
  const q = (s) => host.querySelector(s);
  const set = (sel, v) => { const el = q(sel); if (el) el.textContent = v };
  set('.scchips b', Math.round(shown.chips));
  set('.scmult b', +shown.mult.toFixed(2));
  set('.scscore b', Math.floor(shown.chips * shown.mult).toLocaleString());
  set('.scpchips', String(Math.round(shown.chips)));
  set('.scpmult', String(+shown.mult.toFixed(2)));
  set('.scpscore', Math.floor(shown.chips * shown.mult).toLocaleString());
  const note = q('.schandname em');
  if (note) {
    const hand = handByKey(SC.hand);
    note.textContent = '基础 ' + (hand.chips + (SC.level - 1) * (hand.l_chips || 0)) + ' × ' + (hand.mult + (SC.level - 1) * (hand.l_mult || 0)) + '　·　本局打过 ' + handPlayCount(SC.hand) + ' 次';
  }
  const warn = q('.scwarn');
  if (warn) {
    if (r.warns.length) {
      warn.innerHTML = '<b>这些没自动算</b>（依赖运行时状态或条件无法判定）：' + r.warns.map((x) => `<div>· ${x.n} <em>${x.why}</em></div>`).join('');
      warn.hidden = false;
    } else warn.hidden = true;
  }
  const log = q('.sclog');
  if (log) {
    log.querySelector('summary').textContent = '结算账目（' + r.rows.length + ' 步）';
    const body = log.querySelectorAll('.scline');
    if (body.length === r.rows.length) {
      r.rows.forEach((x, k) => {
        const row = body[k];
        row.querySelector('i').textContent = Math.round(x.chips) + ' × ' + (+x.mult.toFixed(2));
      });
    }
  }
}

/* ---------------------------------------------------------------- shell */
let detailTimer = null;
function render () {
  SUIT_HC = !!(S.forge && S.forge.variants);   /* 高对比开关同时决定花色文字用 SO_1 还是 SO_2 */
  /* 重建 DOM 会让滚动条跳回顶部 —— 记下来再还原，点选项时就不会「跳变」了 */
  const keepScroll = (sel) => { const el = document.querySelector(sel); return el ? el.scrollTop : 0 };
  const prevScroll = { content: keepScroll('#content'), sidebar: keepScroll('#sidebar'), page: window.scrollY || 0 };
  const restoreScroll = () => {
    const c = document.querySelector('#content'); if (c) c.scrollTop = prevScroll.content;
    const sb = document.querySelector('#sidebar'); if (sb) sb.scrollTop = prevScroll.sidebar;
    if (prevScroll.page && !document.querySelector('#content')) window.scrollTo(0, prevScroll.page);
  };
  requestAnimationFrame(restoreScroll);   /* 下一帧还原：不用管 render() 在哪一行结束 */
  if (detailTimer) { clearInterval(detailTimer); detailTimer = null; }
  stopAnim();
  S.anim.t = S.phase;
  if (S.tab !== 'score' && SCP.open) closeScPicker();   /* 离开计分页就把选择器收掉 */
  renderSidebar();
  const content = document.getElementById('content');
  content.innerHTML = '';
  if (S.tab === 'codex') viewCodex(content);
  else if (S.tab === 'forge') { forgeRedraw = null; viewForge(content); }
  else if (S.tab === 'atlas') viewAtlas(content);
  else if (S.tab === 'hands') viewHands(content);
  else if (S.tab === 'score') viewScore(content);
  else if (S.tab === 'maker') {
    try { viewMaker(content) } catch (e) {
      console.error('[Mod 制作器] 渲染出错:', (e && e.stack) || e);
      content.innerHTML = '<div class="hint">Mod 制作器出错：' + esc(e.message) +
        '<br><br>' + esc(String((e && e.stack) || '').split('\n').slice(0, 6).join('\n')) + '</div>';
    }
  }
  else if (S.tab === 'shaders') viewShaders(content);
  else if (S.tab === 'data') viewData(content);
  else if (S.tab === 'mods') viewMods(content);
  renderDetail();
  syncHash();
  document.getElementById('statItems').textContent = ITEMS.length;
  document.getElementById('statSel').textContent = S.sel ? S.sel : '—';
}
function buildTopbar () {
  const tb = document.getElementById('topbar');
  tb.innerHTML = `
    <button class="tbtn" id="navToggle" title="分类" aria-label="打开分类">☰</button>
    <div id="logo"><b>BALATRO</b><span>素材图鉴 · v${D.meta.version || '1.0.1o'}</span></div>
    <div id="searchWrap"><span class="ico">🔍</span><input id="search" placeholder="搜索：名称 / ID / 描述 / cat:Joker  cost>=5  rarity:3  pos:0,0" autocomplete="off"><button id="clearSearch" title="清空">✕</button></div>
    <div class="tbtools">
      <select id="langSel" class="tbtn" title="语言">${D.meta.locales.map((l) => `<option value="${l.code}"${l.code === S.lang ? ' selected' : ''}>${l.label}</option>`).join('')}</select>
      <select id="scaleSel" class="tbtn" title="显示尺寸">${[1, 2, 3, 4].map((s) => `<option value="${s}"${s === S.scale ? ' selected' : ''}>显示 ${s}x</option>`).join('')}</select>
      <div class="slider" title="版本特效与悬浮立绘的定格相位；0 = 立绘摆正"><label>相位</label><input id="phase" type="range" min="0" max="240" step="1" value="${S.phase}"></div>
      <button class="tbtn" id="btnRawSize" title="小小丑 / 半张小丑 / 拍立得 / 方块小丑 / 补充包在原版里卡框尺寸被改过；点这里改成按原始贴图尺寸渲染与导出">📐 原尺寸</button>
      <button class="tbtn" id="btnZip">⤓ 导出当前分类 ZIP</button>
      <button class="tbtn" id="btnHelp">? 帮助</button>
    </div>`;
  const si = document.getElementById('search');
  si.value = S.q;
  let deb;
  si.oninput = () => { clearTimeout(deb); deb = setTimeout(() => { S.q = si.value; render(); }, 130); };
  si.onkeydown = (e) => { if (e.key === 'Escape') { si.value = ''; S.q = ''; render(); } };
  document.getElementById('clearSearch').onclick = () => { si.value = ''; S.q = ''; render(); };
  document.getElementById('langSel').onchange = (e) => { S.lang = e.target.value; render(); };
  document.getElementById('scaleSel').onchange = (e) => { S.scale = +e.target.value; render(); };
  document.getElementById('phase').oninput = (e) => { S.phase = +e.target.value; if (S.tab === 'forge' && forgeRedraw) forgeRedraw(); };
  const rawBtn = document.getElementById('btnRawSize');
  rawBtn.classList.toggle('on', S.rawSize);
  rawBtn.onclick = () => {
    S.rawSize = !S.rawSize;
    rawBtn.classList.toggle('on', S.rawSize);
    toast(S.rawSize ? '已切换为原始贴图尺寸（忽略原版卡框缩放）' : '已恢复原版卡框尺寸');
    render();
  };
  document.getElementById('btnZip').onclick = () => exportList(currentList());
  document.getElementById('btnHelp').onclick = showHelp;
  document.getElementById('navToggle').onclick = () => toggleDrawer('nav-open');
}
/* ---------------------------------------------------------- mobile drawers */
/* 与 app.css 的外壳断点保持一致：≤900px 时侧栏与详情面板都变成覆盖层（平板也算窄屏） */
const isNarrow = () => window.matchMedia('(max-width: 900px)').matches;
function toggleDrawer (cls, force) {
  const on = force === undefined ? !document.body.classList.contains(cls) : force;
  for (const c of ['nav-open', 'detail-open']) if (c !== cls) document.body.classList.remove(c);
  document.body.classList.toggle(cls, on);
  return on;
}
function closeDrawers () { document.body.classList.remove('nav-open', 'detail-open'); }
function showHelp () {
  const d = document.getElementById('detail');
  d.className = '';
  d.innerHTML = `<div class="dhead"><h3>使用说明</h3><div class="id">Balatro 素材图鉴</div></div>
  <div class="sect"><h4>这是什么</h4><div class="desc">把 <code>${esc(D.meta.source)}</code> 里的全部美术素材与游戏数据解析出来，做成一个可离线打开的查看 / 预览 / 提取工具。共收录 <b>${ITEMS.length}</b> 个条目、<b>${Object.keys(D.atlases).length}</b> 个图集。</div></div>
  <div class="sect"><h4>搜索语法</h4><div class="desc">
    普通关键词会同时匹配 <b>ID / 所有语言名称 / 描述原文 / 配置数值 / 图集坐标</b>。<br>
    还支持字段过滤：<br>
    <span class="mono">cat:Joker</span> 分类 &nbsp; <span class="mono">set:Tarot</span> 原始 set<br>
    <span class="mono">rarity:3</span> 稀有度 &nbsp; <span class="mono">cost&lt;=4</span> 费用上限<br>
    <span class="mono">atlas:Jokers</span> 图集 &nbsp; <span class="mono">pos:0,0</span> 格子坐标<br>
    <span class="mono">effect:Mult</span> 效果关键词<br>
    可以混用：<span class="mono">cat:Joker rarity:1 cost&gt;=4</span>
  </div></div>
  <div class="sect"><h4>强化 / 蜡封 / 版本的外观变化</h4><div class="desc">
    进入 <b>卡牌合成台</b>：选一张扑克牌，再叠加 <b>强化牌</b>（奖励、倍率、万能、玻璃、钢铁、石头、黄金、幸运）、
    <b>蜡封</b>、<b>贴纸</b> 与 <b>版本</b>（闪箔 / 镭射 / 彩虹 / 负片），即可看到和原版一致的外观变化。<br>
    版本特效是直接从 <code>resources/shaders/*.fs</code> 移植的 GLSL，顶栏「相位」滑杆可以换一个定格瞬间。
  </div></div>
  <div class="sect"><h4>导出格式</h4><div class="desc">
    · <b>PNG</b>：1x / 2x / 4x / 6x，透明背景（2x 为游戏原始像素）<br>
    · <b>SVG</b>：内嵌位图的矢量容器，方便排版<br>
    · <b>ZIP</b>：整批导出，含 PNG + manifest.json + data.csv + README<br>
    · <b>JSON / CSV / Markdown</b>：数据总表右上角<br>
    · <b>.fs</b>：着色器源码，在「着色器」页导出
  </div></div>
  <div class="sect"><h4>盲注动画</h4><div class="desc">
    <code>BlindChips.png</code> 是 21 帧的横向动画图集。打开任意盲注的详情页，用「动画帧」滑杆或播放按钮逐帧查看，导出的是当前帧。
  </div></div>
  <div class="sect"><h4>导入 Mod</h4><div class="desc">
    左侧「<b>导入 Mod</b>」可以直接读 <b>Steamodded（SMODS）格式</b> 的 Mod：拖入整个 Mod 文件夹或它的 zip，
    解析器会读 <code>manifest.json</code>、入口 lua、<code>assets/{{1x,2x}}</code> 图集与 <code>localization/</code>，
    把 Mod 的小丑牌 / 消耗品 / 自定义类型接进图鉴，并单独标上 <b>MOD</b> 角标。<br>
    全程在本地完成，不联网、不上传文件。若某个牌是运行时循环生成的，会写进导入日志的警告里。
  </div></div>
  <div class="sect"><h4>数据来源</h4><div class="desc">
    条目与数值解析自 <code>game.lua</code>（P_CENTERS / P_BLINDS / P_TAGS / P_SEALS / P_STAKES / P_CARDS）、
    <code>challenges.lua</code> 与 <code>localization/*.lua</code>；贴图取自 <code>resources/textures/2x/</code>。<br>
    描述中的 <span class="ph">#n#</span> 是原版运行时才计算的数值（例如「当前为 X 倍率」），此处原样保留。
  </div></div>
  <div class="sect"><h4>快捷键</h4><div class="desc"><kbd>/</kbd> 聚焦搜索 &nbsp; <kbd>Esc</kbd> 清空搜索 &nbsp; <kbd>←</kbd><kbd>→</kbd> 上一个 / 下一个条目</div></div>
  <div class="sect"><h4>关于本站</h4><div class="desc">
    这是一个<b>非官方粉丝工具</b>，与 <b>LocalThunk</b> / <b>Playstack</b> 没有任何关联。<br>
    站点与页面本身<b>不包含任何游戏素材或游戏数据</b>：上面看到的每一张贴图、每一条数据，都是用你自己电脑上的游戏文件在这个页面里当场解析出来的，
    解析结果只留在浏览器内存里，关闭页面即消失，全程不联网、不上传。<br>
    游戏素材与数据的版权归原作者所有；本站只提供「查看你自己拥有的那份游戏」的工具，请勿把解析结果当作素材包传播。
    ${window.__SITE_HOME__ ? `<br><br>想回到工具箱看别的工具？<a href="${window.__SITE_HOME__}" style="color:var(--accent)">← 返回工具箱</a>（左下角状态栏也有一个入口）` : ''}
  </div></div>`;
}

function buildStatus () {
  const st = document.getElementById('status');
  const stamp = window.__APP_BUILD__ ? ` · 构建 ${window.__APP_BUILD__}` : '';
  /* 挂在上层工具箱站点里时，状态栏最左边放一个回工具箱的小入口（站点构建才会设这个变量） */
  const home = window.__SITE_HOME__ ? `<a class="homebtn" href="${window.__SITE_HOME__}" title="回到工具箱">← 工具箱</a>` : '';
  st.innerHTML = `${home}<span>条目 <b id="statItems">${ITEMS.length}</b></span><span>当前 <b id="statSel">—</b></span>
    <span>图集 <b>${Object.keys(D.atlases).length}</b></span><span>贴图 <b>${D.atlasIndex.length}</b></span>
    <span>语言 <b>${D.meta.locales.length}</b></span>${MODS.length ? `<span>Mod <b>${MODS.length}</b> · ${MODS.reduce((a, m) => a + m.items, 0)} 条</span>` : ''}<span style="margin-left:auto" title="查看器代码的构建号：和别人对比时可以确认是不是同一版">数据生成于 ${new Date(D.meta.generated).toLocaleString()} · 离线运行${stamp}</span>`;
}

/* ------------------------------------------------------------------ init */
function init () {
  applyHash();
  buildTopbar();
  buildStatus();
  render();
  window.addEventListener('hashchange', () => { if (applyHash()) render() });
  // mobile drawers: backdrop closes, Escape closes, resizing to desktop resets
  const bd = document.getElementById('backdrop');
  if (bd) bd.onclick = closeDrawers;
  window.addEventListener('resize', () => { if (!isNarrow()) closeDrawers(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawers(); });
  /* 选择器开着的时候 Esc 先关它（搜索框里也认） */
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && SCP.open) closeScPicker(); });
  document.addEventListener('keydown', (e) => {    const tag = (e.target.tagName || '').toLowerCase();
    if (e.key === '/' && tag !== 'input' && tag !== 'select') { e.preventDefault(); document.getElementById('search').focus(); return; }
    if (tag === 'input' || tag === 'select') return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      const list = currentList();
      if (!list.length) return;
      let i = list.findIndex((x) => x.id === S.sel);
      i = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? Math.min(list.length - 1, i + 1) : Math.max(0, i - 1);
      if (i < 0) i = 0;
      selectItem(list[i].id);
      const el = document.querySelector(`.cell[data-id="${list[i].id}"]`);
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  });
  // a mod dropped anywhere on the page is imported instead of navigating the browser away
  let dragDepth = 0;
  const hasFiles = (e) => !!(e.dataTransfer && Array.from(e.dataTransfer.types || []).indexOf('Files') >= 0);
  window.addEventListener('dragenter', (e) => { if (!hasFiles(e)) return; e.preventDefault(); dragDepth++; document.body.classList.add('dropping') });
  window.addEventListener('dragover', (e) => { if (!hasFiles(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy' });
  window.addEventListener('dragleave', (e) => { if (!hasFiles(e)) return; dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) document.body.classList.remove('dropping') });
  window.addEventListener('drop', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth = 0; document.body.classList.remove('dropping');
    S.tab = 'mods'; S.source = 'all'; render();   // land on the import panel so the log is visible
    filesFromDrop(e.dataTransfer).then((files) => importBatch(files));
  });

  // warm up every sheet, then repaint once they are decoded
  for (const f in ATLAS) img(f);
  ALL_READY = Promise.all(Object.keys(ATLAS).map((f) => IMG_READY[f]));
  // Debug / scripting handle: drive the viewer straight from the console.
  window.__BALATRO__ = {
    data: D, state: S, items: ITEMS, byId: BY_ID, atlases: D.atlases, colors: D.colors,
    compose, specForItem, tileLayer, shade, shadeTile, glApply, uvRectOf, phaseNow, hasAnim, shaderPreview,
    modShaders: MOD_SHADERS, editionShaderOf, resolveShaderKey, detectPeriod, animOpts, refreshForgeLists, forgeSpec,
    hashString, applyHash, syncHash, shareUrl, copyLink,
    encodeGIF, encodeAPNG, buildAnimFrames, loopSeamRatio,
    renderAnim, encodeAPNG, zipStore, canvasBytes, toCSV, itemJSON, save, downloadText, render, toast,
    webgl: !!GL,
    get shaderPrograms () { return GL ? GL.names() : [] },
    // --- mod import ---
    mods: MODS, importModZip, importModFiles, importBatch, importZipBuffer, filesFromDrop, removeMod, sourceItems,
    modImport: window.__MODIMPORT__, categoryLabel,
    /* Mod 制作器：状态 / 生成的 Lua / manifest / 要打包的文件（脚本与控制台都能用） */
    maker: { typeChip: (ty) => { mkSet({ type: ty }) }, get state () { return MK },   /* 必须是 getter：MK 会被重新指向 */ lua: () => mkLua(), manifest: () => mkManifest(), files: () => mkBuildFiles(), types: MK_TYPES, when: MK_WHEN, eff: MK_EFF, motion: MK_MOTION, delays: () => mkFrameDelays(MK.art), animArgs: () => mkAnimArgs(MK.art),
      project: MKR, addItem: mkAddItem, applyClone: (id) => (mkApplyCloneImpl ? mkApplyCloneImpl(id) : null), itemsByCat: (cat) => ITEMS.filter((i) => i.cat === cat).map((i) => i.id), dupItem: mkDupItem, delItem: mkDelItem, moveItem: mkMoveItem, select: mkSelect, grouped: mkGrouped,
      projectJSON: mkProjectJSON, applyProject: mkApplyProject, restoreImages: mkRestoreImages, saveProject: mkSaveProject, loadProject: mkLoadProject,
      presets: MK_PRESETS, cond: MK_COND, readImage: mkReadImage, sheet: (scale, which) => mkSheetCanvas(scale, which || "art"),
      atlasLabel: mkAtlasLabel },   /* 脚本/控制台都能用：读图（含动图拆帧）、取帧序列画布 */
    // --- 得分计算器（脚本化测试与自用都方便）---
    score: { state: SC, compute: scoreCompute, card: scCard, jokerFromItem,
      rules: () => (typeof JOKER_RULES !== 'undefined' ? JOKER_RULES : null),
      state2: () => JOKER_STATE,
      /* 脚本化摆一手牌：顺序、牌型自动判定、重绘都跟着走（验证与自用都方便） */
      setHand: (cards, jokers) => {
        SC.played = (cards || []).map((c) => (Array.isArray(c) ? scCard(c[0], c[1], c[2] || '', c[3] || '', c[4] || '') : c));
        SC.held = [];
        SC_UI.order = SC.played.slice();
        SC.jokers = (jokers || []).map((x) => (typeof x === 'string' ? jokerFromItem(BY_ID[x]) : x)).filter(Boolean);
        SC.handMode = 'auto';
        scSyncHand();
        render();
        return SC.hand;
      },
      /* 调试用：把条件判定与参数替换也暴露出来，一行就能查出某张牌为什么没触发 */
      condCard: (cond, card, j) => condMatchesCard(cond, card, j),
      condHand: (cond, j, n) => condMatchesHand(cond, j, n),
      substParams: (txt, j) => scSubstParams(txt, j),
      params: (j) => scJokerParams(j),
      /* mod / 控制台登记自己盲注效果的入口：
         B.score.blindRules['bl_myboss'] = { halfBase: true, note: '…' } */
      blindRules: SC_BLIND_RULES_EXTRA, blindRulesBuiltin: SC_BLIND_RULES,
      blind: () => scBlindItem(), blindNote: () => scBlindNoteHtml(), debuffed: (c) => scCardDebuffed(c),
      /* 调试/扫描用：某张牌的描述 HTML（含内联控件）与它的动态值清单 */
      descHtml: (j) => scJokerDescHtml(j),
      locVars: (j) => (JOKER_LOCVARS[j.name] || []),
      nm: (it, lang) => nm(it, lang),
      detect: () => scDetectHand(),
      hand: () => SC.hand },
  };
  ALL_READY.then(() => {
    // the handle exists before the first paint (which waits for every sheet to decode)
    window.__BALATRO_READY__ = false;
    render();                        /* 贴图解码完再整页重画一次：补上首屏那些空白缩略图 */
    if (S.tab === 'forge' && forgeRedraw) forgeRedraw();
    console.log('[Balatro 素材图鉴] 已加载', ITEMS.length, '个条目 /', Object.keys(D.atlases).length, '个图集 /', Object.keys(ATLAS).length, '张贴图 /',
      GL ? GL.names().length + ' 个着色器就绪' : '无 WebGL');
    if (MODS.length) console.log('[Balatro 素材图鉴] 已导入', MODS.length, '个 Mod');
    console.log('[Balatro 素材图鉴] 控制台可用 window.__BALATRO__ 直接调用 compose / encodeAPNG 等接口');
    // 首帧之后才置位，测试/驱动脚本可安全等待
    setTimeout(() => { window.__BALATRO_READY__ = true; }, 0);
  });
}
/* ================================================================ Mod 制作器
 * 目标：不写代码也能做出一个能用的 mod。所有选项都是预设式的（和得分计算器里改小丑牌记录值一样的路子），
 * 生成标准 Steamodded 代码；再往上一层有「高级」面板，可以改 key / 稀有度 / config，也可以直接编辑生成的 Lua。
 * 导出是一个能直接丢进 Mods/ 的 zip；「自检」会真的把它导一遍，看条目数与警告。
 *
 * 已经导入过别的 mod 时，可以「照它的条目做一个」：贴图、配置、文案先复制过来再改 —— 新内容继续往上长。
 * 贴图既可以从任意图集里挑一格（原版或 mod 的），也可以直接上传自己的 PNG（自动生成 1x / 2x 两张）。
 */

const MK_TYPES = [
  ['Joker', '小丑牌', 'Joker', 'j_'],
  ['Consumable', '消耗品（塔罗 / 星球 / 幽灵）', 'Consumable', 'c_'],
  ['Voucher', '优惠券', 'Voucher', 'v_'],
  ['Booster', '补充包', 'Booster', 'p_'],
  ['Back', '牌组', 'Back', 'b_'],
  ['Enhanced', '强化牌', 'Enhanced', 'm_'],
  ['Edition', '版本', 'Edition', 'e_'],
  ['Seal', '蜡封', 'Seal', 's_'],
  ['Tag', '标签', 'Tag', 'tag_'],
  ['Blind', '盲注', 'Blind', 'bl_'],
];
const MK_WHEN = [
  ['card', '每张打出的牌（逐牌）'],
  ['hand', '打出这一手时（整手一次）'],
  ['held', '留在手里时'],
  ['repetition', '再结算一次（重触发）'],
  ['discard', '每次弃牌时'],
  ['independent', '每张牌独立结算时'],
  ['sell', '这张牌被卖掉时'],
];
const MK_COND = [
  ['', '无条件'],
  ['suit', '花色是…'],
  ['rank', '点数是…'],
  ['face', '人头牌（J/Q/K）'],
  ['enh', '强化是…'],
  ['even', '偶数点数'],
  ['odd', '奇数点数'],
  ['hand', '牌型是…'],
  ['edition', '版本是…'],
  ['seal', '蜡封是…'],
  ['deckcount', '牌堆里至少…张'],
  ['count', '这一手至少…张'],
];
const MK_EFF = [
  ['chips', '+ 筹码'],
  ['mult', '+ 倍率'],
  ['xmult', '× 倍率'],
  ['dollars', '+ 金钱'],
  ['reps', '再多结算 N 次'],
  ['hands', '+ 出牌次数'],
  ['discards', '+ 弃牌次数'],
  ['handsize', '+ 手牌上限'],
  ['tarot', '给一张随机塔罗'],
  ['planet', '给一张随机星球'],
  ['levelup', '升级打出的牌型'],
  ['joker', '给一张随机小丑牌'],
];
/* 常用效果预设：点一下就把整套效果行填好（仍然不用写代码） */
const MK_PRESETS = [
  ['每张打出的红桃 +50 筹码', [{ when: 'card', cond: 'suit', condVal: 'Hearts', eff: 'chips', val: 50 }]],
  ['每张打出的黑桃 +3 倍率', [{ when: 'card', cond: 'suit', condVal: 'Spades', eff: 'mult', val: 3 }]],
  ['每张人头牌 ×1.5 倍率', [{ when: 'card', cond: 'face', eff: 'xmult', val: 1.5 }]],
  ['每张打出的 A +30 筹码', [{ when: 'card', cond: 'rank', condVal: 'Ace', eff: 'chips', val: 30 }]],
  ['打出对子时 +$2', [{ when: 'hand', cond: 'hand', condVal: 'Pair', eff: 'dollars', val: 2 }]],
  ['打出这一手 +4 倍率', [{ when: 'hand', cond: '', eff: 'mult', val: 4 }]],
  ['每弃一张牌 +1 倍率', [{ when: 'discard', cond: '', eff: 'mult', val: 1 }]],
  ['每张打出的牌再结算一次', [{ when: 'repetition', cond: '', eff: 'reps', val: 1 }]],
  ['留在手里的牌 +20 筹码', [{ when: 'held', cond: '', eff: 'chips', val: 20 }]],
  ['打完这一手 +1 出牌次数', [{ when: 'hand', cond: '', eff: 'hands', val: 1 }]],
  ['打完这一手 +1 弃牌次数', [{ when: 'hand', cond: '', eff: 'discards', val: 1 }]],
  ['手牌上限 +1', [{ when: 'hand', cond: '', eff: 'handsize', val: 1 }]],
  ['卖掉这张牌 +$3', [{ when: 'sell', cond: '', eff: 'dollars', val: 3 }]],
  ['每张打出的梅花 ×1.2 倍率', [{ when: 'card', cond: 'suit', condVal: 'Clubs', eff: 'xmult', val: 1.2 }]],
  ['打出同花时 +$5', [{ when: 'hand', cond: 'hand', condVal: 'Flush', eff: 'dollars', val: 5 }]],
];
const MK_RARITY = [[1, '普通'], [2, '罕见'], [3, '稀有'], [4, '传奇']];
/* 常见图集的中文说明（图集名本身是游戏里的键，没法翻译，这里给"它是什么"） */
const MK_ATLAS_CN = {
  Joker: '小丑牌', centers: '中心图集（塔罗 / 星球 / 强化 / 牌背…）', Tarot: '塔罗牌', Planet: '星球牌',
  Spectral: '幽灵牌', Voucher: '优惠券', Booster: '补充包', tags: '标签', stickers: '贴纸',
  blind_chips: '盲注筹码', cards_1: '扑克牌面（标准）', cards_2: '扑克牌面（高对比）',
  Enhancers: '强化牌底纹', Edition: '版本', ui_1: '界面素材', ui_2: '界面素材（高对比）',
  shop_sign: '商店招牌', chips: '筹码', money: '金额', '8BitDeck': '扑克牌面',
};
/** 图集下拉里显示的文案：中文说明 + 原始名 */
function mkAtlasLabel (name) { return (MK_ATLAS_CN[name] ? MK_ATLAS_CN[name] + '（' + name + '）' : name) }
/** 图片格式说明（放在上传那一行下面） */
const MK_IMG_TIP = '支持 PNG / JPG / WebP / GIF / APNG；**动图会自动拆帧**（最多 24 帧），导出成横向帧序列 sheet.png，并在图集声明里写上 frames。';
const MK_SUITS = [['Hearts', '红桃'], ['Diamonds', '方片'], ['Spades', '黑桃'], ['Clubs', '梅花']];
const MK_RANKS = [['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'], ['6', '6'], ['7', '7'], ['8', '8'], ['9', '9'], ['10', '10'], ['Jack', 'J'], ['Queen', 'Q'], ['King', 'K'], ['Ace', 'A']];
const MK_ENH = [['', '不限'], ['m_bonus', '奖励牌'], ['m_mult', '倍率牌'], ['m_wild', '万能牌'], ['m_glass', '玻璃牌'],
  ['m_steel', '钢铁牌'], ['m_stone', '石头牌'], ['m_gold', '黄金牌'], ['m_lucky', '幸运牌']];
const MK_EDITION = [['', '不限'], ['e_foil', '闪箔'], ['e_holo', '镭射'], ['e_polychrome', '多彩'], ['e_negative', '负片']];
const MK_SEAL = [['', '不限'], ['Red', '红蜡封'], ['Blue', '蓝蜡封'], ['Gold', '金蜡封'], ['Purple', '紫蜡封']];
const MK_USE = [['dollars', '给一笔钱'], ['chips', '本手 +筹码'], ['mult', '本手 +倍率'],
  ['handsize', '手牌上限 +N'], ['tarot', '给一张随机塔罗'], ['planet', '给一张随机星球'],
  ['none', '什么都不做（占位）']];
const MK_SETS = [['Tarot', '塔罗'], ['Planet', '星球'], ['Spectral', '幽灵']];
const MK_USE_ANY_TYPE = false;   /* 非小丑牌类型也允许挑牌组 */

/* 每种类型"专属"要填的东西（都在界面上，不用猜）：键 / 标签 / 类型 / 选项 / 默认值 */
const MK_TYPE_FIELDS = {
  Blind: [['boss_min', '起始底注', 'num', 1], ['boss_max', '结束底注', 'num', 10], ['blind_mult', '盲注需求倍数', 'num', 2],
    ['blind_dollars', '奖励金钱', 'num', 5], ['debuff_suit', '削弱哪个花色', 'sel', [['', '不削弱'], ['Spades', '黑桃'], ['Hearts', '红桃'], ['Clubs', '梅花'], ['Diamonds', '方片']]],
    ['debuff_face', '削弱人头牌', 'bool', false]],
  Booster: [['kind', '包的类型', 'sel', [['Arcana', '秘术（塔罗）'], ['Celestial', '天界（星球）'], ['Standard', '标准（扑克）'], ['Buffoon', '小丑'], ['Spectral', '幽灵']]],
    ['choose', '可选几张', 'num', 1], ['extra', '给几张牌', 'num', 3], ['cost', '价格', 'num', 4]],
  Back: [['hand_size', '手牌上限', 'num', 8], ['hands', '出牌次数', 'num', 4], ['discards', '弃牌次数', 'num', 3],
    ['dollars', '起始金钱', 'num', 4], ['joker_slot', '小丑栏位', 'num', 5], ['consumable_slot', '消耗品栏位', 'num', 2]],
  Voucher: [['voucher_kind', '效果', 'sel', [['none', '占位（自己在高级里补）'], ['dollars', '立刻给钱'], ['handsize', '手牌上限 +1'], ['discards', '弃牌次数 +1'], ['slot', '小丑栏位 +1']]], ['voucher_val', '数值', 'num', 10]],
  Tag: [['tag_kind', '触发时', 'sel', [['dollars', '给一笔钱'], ['tarot', '给一张塔罗'], ['planet', '给一张星球'], ['reroll', '免费重掷']]], ['tag_val', '数值', 'num', 5]],
  Enhanced: [['chips', '固定 +筹码', 'num', 30], ['mult', '固定 +倍率', 'num', 4]],
  Edition: [['chips', '固定 +筹码', 'num', 0], ['mult', '固定 +倍率', 'num', 0], ['xmult', '×倍率', 'num', 1.5]],
  Seal: [['seal_note', '蜡封没有数值字段 —— 它的效果由玩家拿它做什么决定', 'text', '']],
};
let MK = {
  type: 'Joker',
  modId: 'mymod', modName: '我的 Mod', author: 'me', version: '1.0.0', desc: '由图鉴 Mod 制作器生成',
  prefix: 'mymod',
  key: 'alpha',
  art: { atlas: 'Joker', pos: { x: 0, y: 0 }, upload: null, uploadName: '', frames: null, animated: false },
  rarity: 1, cost: 4, order: 100, weight: 1,
  eternal: true, perishable: true, blueprint: true,
  nameZh: '阿尔法', nameEn: 'Alpha', textZh: '', textEn: '',
  effects: [{ when: 'card', cond: 'suit', condVal: 'Hearts', eff: 'chips', val: 50 }],
  useKind: 'dollars', useVal: 4, set: 'Tarot',
  /* 悬浮立绘（传奇牌那种飘在半空的画）：开了就多导一张 soul.png，并在 Lua 里写 soul_pos */
  soul: { on: false, atlas: 'Joker', pos: { x: 0, y: 2 }, upload: null, uploadName: '', frames: null, animated: false },
  advanced: false, lua: null, luaDirty: false, config: '', t: {},
  cloneFrom: '',
};

/** 一个 mod 工程：工程级字段 + 条目列表。MK 永远指向 items[cur]，也就是「正在编辑的那一条」。 */
const MK_PROJ_KEY = 'balatro.maker.project.v1';
/* 给界面用的路径提示（网页读不到你的硬盘，这只是通用位置说明） */
const GAME_DIR_HINT = '%SteamLibrary%\\steamapps\\common\\Balatro（Steam 里右键游戏 → 管理 → 浏览本地文件）';
const MODS_DIR_HINT = '%AppData%\\Balatro\\Mods（把这一串粘到资源管理器地址栏就能打开）';
const MKR = {
  modId: MK.modId, modName: MK.modName, author: MK.author, version: MK.version, prefix: MK.prefix, desc: MK.desc,
  items: [MK], cur: 0, v: 1,
};
/** 条目在文件名 / 图集 key 里用的 slug */
function mkSlug (it) { return String((it || MK).key || 'item').replace(/[^A-Za-z0-9_]/g, '_') || 'item' }
/** 新条目：拿当前条目的图集当默认，名字按类型给 */
function mkBlankItem (type) {
  const ty = type || MK.type;
  const d = MK_DEFAULT_NAME[ty] || ['新条目', 'newitem'];
  return {
    type: ty,
    key: d[1],
    art: { atlas: MK.art.atlas, pos: { x: 0, y: 0 }, upload: null, uploadName: '', frames: null, animated: false, weights: null, gen: null, delays: null, speed: 1 },
    rarity: 1, cost: 4, order: 100, weight: 1,
    eternal: true, perishable: true, blueprint: true,
    nameZh: d[0], nameEn: d[0], textZh: '', textEn: '',
    effects: [{ when: 'card', cond: 'suit', condVal: 'Hearts', eff: 'chips', val: 50 }],
    useKind: 'dollars', useVal: 4, set: 'Tarot',
    soul: { on: false, atlas: MK.soul.atlas, pos: { x: 0, y: 2 }, upload: null, uploadName: '', frames: null, animated: false, weights: null, gen: null, delays: null },
    advanced: false, lua: null, luaDirty: false, config: '', t: {}, cloneFrom: '',
  };
}
function mkSelect (i) { if (i < 0 || i >= MKR.items.length) return; MKR.cur = i; MK = MKR.items[i] }
/** 导出/加载前把重名的 key 归一化：同一个 mod 里两条同 key 会互相覆盖 */
function mkNormalizeKeys () {
  const used = {};
  MKR.items.forEach((it) => {
    let k = String(it.key || 'item').replace(/[^A-Za-z0-9_]/g, '_') || 'item';
    if (used[k]) { let i = 2; while (used[k + '_' + i]) i++; k = k + '_' + i }
    used[k] = 1;
    it.key = k;
  });
}
function mkEnsureItems () { if (!MKR.items.length) MKR.items.push(mkBlankItem()); if (MKR.cur >= MKR.items.length) MKR.cur = MKR.items.length - 1; MK = MKR.items[MKR.cur] }
function mkUniqueKey (base) {
  const used = {};
  MKR.items.forEach((it) => { if (it !== MK) used[it.key] = 1 });
  const k = String(base || 'item').replace(/[^A-Za-z0-9_]/g, '_') || 'item';
  if (!used[k]) return k;
  let i = 2;
  while (used[k + '_' + i]) i++;
  return k + '_' + i;
}
function mkAddItem (type) {
  const it = mkBlankItem(type);
  it.key = mkUniqueKey(it.key);
  MKR.items.push(it);
  mkSelect(MKR.items.length - 1);
  return it;
}
/** 复制当前条目：贴图 / 帧序列 / 立绘都跟着来，key 换个不重名的 */
function mkDupItem () {
  const keepArt = Object.assign({}, MK.art), keepSoul = Object.assign({}, MK.soul);
  const it = mkBlankItem(MK.type);
  for (const k of Object.keys(MK)) { if (k === 'art' || k === 'soul') continue; it[k] = MK[k] }
  it.art = keepArt; it.soul = keepSoul;
  it.effects = (MK.effects || []).map((e) => Object.assign({}, e));
  it.key = mkUniqueKey(MK.key + '_copy');
  it.nameZh = (MK.nameZh || MK.key) + ' 副本';
  MKR.items.splice(MKR.cur + 1, 0, it);
  mkSelect(MKR.cur + 1);
  return it;
}
function mkDelItem () {
  if (MKR.items.length <= 1) return false;
  MKR.items.splice(MKR.cur, 1);
  mkSelect(Math.max(0, MKR.cur - 1));
  return true;
}
function mkMoveItem (d) {
  const j = MKR.cur + d;
  if (j < 0 || j >= MKR.items.length) return false;
  const t = MKR.items[MKR.cur]; MKR.items[MKR.cur] = MKR.items[j]; MKR.items[j] = t;
  mkSelect(j);
  return true;
}
/** 按类型分组统计（概览与列表都用它） */
function mkGrouped () {
  const g = {};
  MKR.items.forEach((it, i) => { (g[it.type] = g[it.type] || []).push({ it: it, i: i }) });
  return MK_TYPES.map((t) => ({ type: t[0], name: t[1], rows: g[t[0]] || [] })).filter((x) => x.rows.length);
}
/** 工程 → 可序列化对象；withImages=true 时把上传的图与帧编成 dataURL（工程备份用） */
function mkProjectJSON (withImages) {
  const img = (cv) => { try { return cv && cv.toDataURL ? cv.toDataURL('image/png') : null } catch (e) { return null } };
  const one = (it) => {
    const o = {
      type: it.type, key: it.key, rarity: it.rarity, cost: it.cost, order: it.order, weight: it.weight,
      eternal: !!it.eternal, perishable: !!it.perishable, blueprint: !!it.blueprint,
      nameZh: it.nameZh, nameEn: it.nameEn, textZh: it.textZh, textEn: it.textEn,
      effects: (it.effects || []).map((e) => ({ when: e.when, cond: e.cond, condVal: e.condVal, eff: e.eff, val: e.val })),
      useKind: it.useKind, useVal: it.useVal, set: it.set, advanced: !!it.advanced, config: it.config || '', cloneFrom: it.cloneFrom || '',
      art: { atlas: it.art.atlas, pos: it.art.pos, weights: it.art.weights || null, gen: it.art.gen || null, delays: it.art.delays || null, uploadName: it.art.uploadName || '' },
      soul: { on: !!it.soul.on, atlas: it.soul.atlas, pos: it.soul.pos, weights: it.soul.weights || null, gen: it.soul.gen || null, delays: it.soul.delays || null, uploadName: it.soul.uploadName || '' },
    };
    if (withImages) {
      o.art.img = img(it.art.upload);
      o.art.imgs = (it.art.frames || []).map(img).filter(Boolean);
      o.soul.img = img(it.soul.upload);
      o.soul.imgs = (it.soul.frames || []).map(img).filter(Boolean);
    }
    return o;
  };
  return { v: 1, modId: MKR.modId, modName: MKR.modName, author: MKR.author, version: MKR.version, prefix: MKR.prefix, desc: MKR.desc, cur: MKR.cur, items: MKR.items.map(one), at: Date.now() };
}
/** 从对象恢复（启动读 localStorage / 导入工程 JSON 都走它） */
function mkApplyProject (o) {
  if (!o || !o.items || !o.items.length) return false;
  MKR.modId = o.modId || MKR.modId; MKR.modName = o.modName || MKR.modName; MKR.author = o.author || MKR.author;
  MKR.version = o.version || MKR.version; MKR.prefix = o.prefix || MKR.prefix; MKR.desc = o.desc || MKR.desc;
  MKR.items = o.items.map((x) => {
    const it = mkBlankItem(x.type);
    Object.assign(it, {
      key: x.key || it.key, rarity: x.rarity != null ? x.rarity : it.rarity, cost: x.cost != null ? x.cost : it.cost,
      order: x.order != null ? x.order : it.order, weight: x.weight != null ? x.weight : it.weight,
      eternal: !!x.eternal, perishable: !!x.perishable, blueprint: !!x.blueprint,
      nameZh: x.nameZh || it.nameZh, nameEn: x.nameEn || it.nameEn, textZh: x.textZh || '', textEn: x.textEn || '',
      effects: (x.effects && x.effects.length ? x.effects : it.effects).map((e) => Object.assign({}, e)),
      useKind: x.useKind || it.useKind, useVal: x.useVal != null ? x.useVal : it.useVal,
      set: x.set || it.set, advanced: !!x.advanced, config: x.config || '', cloneFrom: x.cloneFrom || '',
    });
    if (x.art) it.art = { atlas: x.art.atlas || it.art.atlas, pos: x.art.pos || { x: 0, y: 0 }, upload: null, uploadName: x.art.uploadName || '', frames: null, animated: false, weights: x.art.weights || null, gen: x.art.gen || null, delays: x.art.delays || null };
    if (x.soul) it.soul = { on: !!x.soul.on, atlas: x.soul.atlas || it.soul.atlas, pos: x.soul.pos || { x: 0, y: 0 }, upload: null, uploadName: x.soul.uploadName || '', frames: null, animated: false, weights: x.soul.weights || null, gen: x.soul.gen || null, delays: x.soul.delays || null };
    return it;
  });
  MKR.cur = Math.max(0, Math.min(o.cur || 0, MKR.items.length - 1));
  MK = MKR.items[MKR.cur];
  mkNormalizeKeys();
  return true;
}
/** 把工程 JSON 里的图片（dataURL）解回来贴到条目上 */
async function mkRestoreImages (o) {
  const load = (u) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = u });
  const cnt = Math.min((o.items || []).length, MKR.items.length);
  for (let i = 0; i < cnt; i++) {
    const src = o.items[i]; const it = MKR.items[i];
    if (src.art && src.art.img) { const im = await load(src.art.img); if (im) it.art.upload = im }
    if (src.art && src.art.imgs && src.art.imgs.length) { const fl = []; for (const u of src.art.imgs) { const im = await load(u); if (im) fl.push(im) } if (fl.length > 1) { it.art.frames = fl; it.art.animated = true; it.art.upload = fl[0] } }
    if (src.soul && src.soul.img) { const im = await load(src.soul.img); if (im) it.soul.upload = im }
    if (src.soul && src.soul.imgs && src.soul.imgs.length) { const fl = []; for (const u of src.soul.imgs) { const im = await load(u); if (im) fl.push(im) } if (fl.length > 1) { it.soul.frames = fl; it.soul.upload = fl[0] } }
  }
}
/** 自动保存：只存设置（图片太大） */
function mkSaveProject () {
  try { localStorage.setItem(MK_PROJ_KEY, JSON.stringify(mkProjectJSON(false))) } catch (e) { /* 隐私模式/超配额：不影响用 */ }
}
function mkLoadProject () {
  try {
    const raw = localStorage.getItem(MK_PROJ_KEY);
    if (!raw) return false;
    return mkApplyProject(JSON.parse(raw));
  } catch (e) { return false }
}
function mkType () { return MK_TYPES.filter((t) => t[0] === MK.type)[0] || MK_TYPES[0] }
/** 每种类型的默认名字与默认 key：换类型时若还没自己改过就一起换（不然永远是"阿尔法"） */
const MK_DEFAULT_NAME = {
  Joker: ['阿尔法', 'alpha'], Consumable: ['测试塔罗', 'testcard'], Voucher: ['测试优惠券', 'testvoucher'],
  Booster: ['测试补充包', 'testpack'], Back: ['测试牌组', 'testdeck'], Enhanced: ['测试强化', 'testenh'],
  Edition: ['测试版本', 'testedition'], Seal: ['测试蜡封', 'testseal'], Tag: ['测试标签', 'testtag'], Blind: ['测试盲注', 'testblind'],
};
/** 预览卡片上显示的那句话：**优先用原文**（用户自己写的 / 从现成的牌复制来的），
 *  没有原文才按「它做什么」里的效果自动生成 —— 以前这里只认自动生成的，导致"选什么都显示同一段内容"。 */
function mkShownText () { return MK.textZh || mkAutoText('zh') || '' }
/** 预览里那句占位文案：小丑牌提示去选预设，其它类型提示专属设置还没填 */
function mkPlaceholderText () {
  return MK.type === 'Joker' ? mkPlaceholderText() : '（这个类型还有专属设置没填）';
}
/** 类型专属设置的当前值 → 一行行读得懂的说明（盲注：底注 1–10 / 需求 ×2 / 削弱梅花…） */
function mkTypeSummaryLines () {
  const defs = MK_TYPE_FIELDS[MK.type];
  if (!defs) return [];
  const out = [];
  defs.forEach((f) => {
    const key = f[0], label = f[1], kind = f[2], opt = f[3];
    const v = MK.t[key] !== undefined ? MK.t[key] : opt;
    if (kind === 'bool') { if (v) out.push(label); return }
    if (kind === 'sel') { const o = (opt || []).filter((x) => x[0] === v)[0]; out.push(label + '：' + (o ? o[1] : v)); return }
    if (kind === 'num') { out.push(label + ' ' + v); return }
  });
  return out;
}
/** 盲注那种"底注 1–10"要连起来读更顺 */
function mkTypeSummaryText () {
  const lines = mkTypeSummaryLines();
  if (MK.type === 'Consumable') {
    const set = (MK_SETS.filter((x) => x[0] === MK.set)[0] || ['', '消耗品'])[1];
    const use = (MK_USE.filter((x) => x[0] === MK.useKind)[0] || ['', ''])[1];
    return ['属于：' + set, '使用时：' + use + (MK.useKind === 'none' ? '' : '（' + MK.useVal + '）'), '价格 $' + MK.cost];
  }
  if (MK.type === 'Seal') return ['蜡封本身没有数值字段：它的效果由「拿它做了什么」决定（原版逻辑）', '外观取自贴图'];
  if (MK.type === 'Blind') {
    const t2 = MK.t;
    const min = t2.boss_min !== undefined ? t2.boss_min : 1, max = t2.boss_max !== undefined ? t2.boss_max : 10;
    const rest = lines.filter((x) => x.indexOf('起始底注') < 0 && x.indexOf('结束底注') < 0);
    return ['在底注 ' + min + '–' + max + ' 出现'].concat(rest);
  }
  return lines;
}
/** 预览卡上的小标签（按类型给） */
function mkTag () {
  const bits = [];
  const t = MK.t || {};
  if (MK.type === 'Joker') {
    bits.push((MK_RARITY.filter((r) => r[0] === MK.rarity)[0] || ['', '普通'])[1]);
    bits.push('$' + MK.cost);
    if (MK.soul.on) bits.push('有立绘');
  } else if (MK.type === 'Consumable') {
    bits.push((MK_SETS.filter((x) => x[0] === MK.set)[0] || ['', '消耗品'])[1]);
    bits.push('$' + MK.cost);
  } else if (MK.type === 'Booster') {
    const kinds = [['Arcana', '秘术包'], ['Celestial', '天界包'], ['Standard', '标准包'], ['Buffoon', '小丑包'], ['Spectral', '幽灵包']];
    bits.push((kinds.filter((x) => x[0] === t.kind)[0] || ['', '补充包'])[1]);
    bits.push('选 ' + (t.choose || 1) + ' / 给 ' + (t.extra || 3));
    bits.push('$' + (t.cost || 4));
  } else if (MK.type === 'Voucher') {
    bits.push('$' + MK.cost);
  } else if (MK.type === 'Blind') {
    bits.push('底注 ' + (t.boss_min || 1) + '–' + (t.boss_max || 10));
    bits.push('需求 ×' + (t.blind_mult || 2));
  } else bits.push(mkType()[1]);
  return bits.map((b) => '<i class="mktag">' + esc(String(b)) + '</i>').join('');
}
function mkTag () {
  const bits = [];
  if (MK.type === 'Joker') bits.push(...MK_RARITY.filter((r) => r[0] === MK.rarity).map((r) => r[1]));
  bits.push('$' + MK.cost);
  if (MK.soul.on && MK.type === 'Joker') bits.push('有立绘');
  return bits.map((b) => '<i class="mktag">' + b + '</i>').join('');
}
/** 和哪张原版牌的效果一样（只有一条效果时给个参照，用户一眼知道自己在做什么） */
function mkClosestVanilla () {
  if (MK.effects.length !== 1) return null;
  const e = MK.effects[0];
  const want = e.eff === "chips" ? /chip/ : e.eff === "mult" ? /mult$/ : e.eff === "xmult" ? /xmult/i : null;
  if (!want) return null;
  const val = Number(e.val) || 0;
  const rules = (typeof JOKER_RULES !== "undefined" && JOKER_RULES.rules) || [];
  for (const it of ITEMS) {
    if (it.cat !== "Joker") continue;
    const r = rules.filter((x) => x.n === it.name)[0];
    if (!r || !r.e || r.k === "manual") continue;
    const hit = r.e.some((ex) => want.test(ex.split("=")[0]));
    if (!hit) continue;
    const cfg = it.config || {};
    const nums = [cfg.extra && cfg.extra.chips, cfg.extra && cfg.extra.mult, cfg.extra && cfg.extra.x_mult, cfg.chip_mod, cfg.mult_mod, cfg.Xmult_mod, typeof cfg.extra === "number" ? cfg.extra : null];
    if (nums.some((v) => typeof v === "number" && Math.abs(v - val) < 1e-6)) return { name: nm(it, "zh_CN"), id: it.id };
  }
  return null;
}
/** 「游戏里会显示成」：一行一条效果，数字按效果分色（和游戏里那套配色一致） */
function mkDescHtml () {
  if (MK.type !== 'Joker') return mkTypeDescHtml();
  if (!MK.effects.length) return "<span class=\"mkdim\">（还没有效果）</span>";
  const colour = { chips: "#009dff", mult: "#fe5f55", xmult: "#f3b958", dollars: "#4bc292", reps: "#a782d1" };
  const lines = MK.effects.map((e) => {
    const c = mkCondText(e);
    let head = "";
    if (e.when === "card") head = "每张" + (c || "打出的") + "牌";
    else if (e.when === "hand") head = "打出这一手" + (c ? "（" + c + "）" : "");
    else if (e.when === "held") head = "留在手里的" + (c || "每张") + "牌";
    else if (e.when === "repetition") head = (c || "打出的牌") + "再结算一次";
    else if (e.when === "discard") head = "每次弃牌";
    else if (e.when === "independent") head = "每张牌独立结算时";
    else if (e.when === "sell") head = "这张牌被卖掉时";
    return head + " " + "<b style=\"color:" + (colour[e.eff] || "#fff") + "\">" + esc(mkEffText(e)) + "</b>";
  });
  const twin = mkClosestVanilla();
  return lines.join("<br>") + (twin ? "<br><span class=\"mkdim\">（和原版「" + esc(twin.name) + "」的效果相同）</span>" : "");
}
/** 非小丑牌类型：描述就是类型专属设置那几行 */
function mkTypeDescHtml () {
  const lines = mkTypeSummaryText();
  if (!lines.length) return '<span class="mkdim">（这个类型还没有专属设置）</span>';
  return lines.map((x) => '· ' + esc(x)).join('<br>');
}
/** 顶部那一行实时摘要 */
function mkSummaryHtml () {
  return '<b>' + esc(mkType()[1]) + '</b> · ' + esc(MK.nameZh || MK.key) +
    ' <code>' + esc(MKR.prefix) + '_' + esc(MK.key) + '</code> · ' + esc(mkShownText() || '还没有效果') +
    ' · 贴图 ' + (MK.art.upload ? '上传的图' : (MK.art.atlas + ' x' + MK.art.pos.x + ' y' + MK.art.pos.y));
}
function mkAtlasName () {
  const a = D.atlases[MK.art.atlas];
  if (MK.art.upload) return null;
  return a ? a.file : null;
}
/** 贴图源画到一张 71×95（或 2 倍）的画布上：从图集里裁一格，或用户上传的图 */
/** 一帧画到 ctx 的指定位置（上传的图 / 图集里的一格） */
function mkDrawSource (ctx, scale, dx, dy, src) {
  const w = CARD_W * scale, h = CARD_H * scale;
  const a = D.atlases[src.atlas];
  if (src.upload) {
    const im = src.upload;
    const r = Math.min(w / im.width, h / im.height);
    const iw = im.width * r, ih = im.height * r;
    ctx.drawImage(im, dx + (w - iw) / 2, dy + (h - ih) / 2, iw, ih);
    return;
  }
  if (!a) return;
  const im2 = IMG[a.file];
  const sc = a.scale || 1;
  const sx = src.pos.x * a.px * sc, sy = src.pos.y * a.py * sc, sw = a.px * sc, sh = a.py * sc;
  try { ctx.drawImage(im2, sx, sy, sw, sh, dx, dy, w, h) } catch (e) { /* 图还没解码完 */ }
}
/** 主体 / 立绘的一帧或整套帧序列（动图时横向铺开，正是原版图集的排法） */
/** 整个工程的 Lua：逐条目生成（生成时把 MK 临时切到那一条上），条目之间空一行 */
function mkLua () {
  mkNormalizeKeys();   /* 生成 Lua 前也归一化一次（两个入口都要） */
  const keep = MK;
  const out = [];
  MKR.items.forEach((it, i) => {
    MK = it;
    if (i) out.push('');
    out.push(mkItemLua());
  });
  MK = keep;
    return out.join('\n');
}
/* ---------------------------------------------------------------- 动效（按游戏里的做法）
 * 游戏里的"动"就一件事：图集里横向排 N 帧 + fps（SMODS.Atlas 的 atlas_table = ANIMATION_ATLAS）。
 * 所以这里不依赖"能拆动图文件"：给了帧序列就用帧序列（GIF / APNG / 多选图片），
 * 没给就按预设把**一张静图现场渲染成帧序列**。帧是惰性生成的，改图集格子/改参数都不会留下过期缓存。 */
const MK_MOTION = [
  ['', '不用预设（有导入的帧就用导入的）'],
  ['float', '上下浮动（像原版的盲注芯片那样来回飘）'],
  ['breathe', '呼吸（整体缓慢放大缩小）'],
  ['sway', '轻微摇摆（左右小幅旋转）'],
  ['blink', '闪烁（明暗起伏）'],
  ['shake', '抖动（小幅左右上下抖）'],
  ['beat', '心跳（快涨慢落）'],
  ['spin', '缓慢旋转（整圈）'],
];
const mkMotionName = (k) => { const m = MK_MOTION.filter((x) => x[0] === k)[0]; return m ? m[1] : (k || "不生成") };
/** 按预设画第 i 帧（整张卡面大小）：静图 + 一点位移/缩放/旋转/透明度就是游戏里那种循环动效 */
function mkGenFrame (src, kind, i, n, amp) {
  const cv = newCanvas(CARD_W, CARD_H);
  const c = cv.getContext("2d");
  c.imageSmoothingEnabled = false;
  const t = i / Math.max(1, n);
  const rad = Math.PI * 2 * t;
  let dx = 0; let dy = 0; let sc = 1; let rot = 0; let al = 1;
  if (kind === 'float') dy = Math.sin(rad) * amp;
  else if (kind === 'breathe') sc = 1 + Math.sin(rad) * amp / 100;
  else if (kind === 'sway') rot = Math.sin(rad) * amp * Math.PI / 180 * 3;
  else if (kind === 'blink') al = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(rad));
  else if (kind === 'shake') { dx = Math.sin(rad * 3) * amp * 0.6; dy = Math.cos(rad * 2) * amp * 0.4 }
  else if (kind === 'beat') { const p = Math.pow(Math.max(0, Math.sin(rad)), 3); sc = 1 + p * amp / 100 }
  else if (kind === 'spin') rot = rad;
  c.save();
  c.globalAlpha = al;
  c.translate(CARD_W / 2 + dx, CARD_H / 2 + dy);
  c.rotate(rot);
  c.scale(sc, sc);
  c.translate(-CARD_W / 2, -CARD_H / 2);
  mkDrawSource(c, 1, 0, 0, src);   /* 静图（上传的图或图集那一格）画进卡面 */
  c.restore();
  return cv;
}
/** 这个图源现在该用哪些帧：导入的帧序列 > 预设现场生成 > null（静态） */
function mkSourceFrames (src) {
  if (!src) return null;
  if (src.frames && src.frames.length) return src.frames;
  const g = src.gen;
  if (!g || !g.kind || !(g.n > 1)) return null;
  const key = [g.kind, g.n, g.amp, src.atlas, src.pos ? src.pos.x + "," + src.pos.y : "", src.uploadName || ""].join("|");
  if (src.__genCache && src.__genCache.key === key) return src.__genCache.list;
  const base = { atlas: src.atlas, pos: src.pos, upload: src.upload || null };
  const list = [];
  for (let i = 0; i < g.n; i++) list.push(mkGenFrame(base, g.kind, i, g.n, g.amp));
  src.__genCache = { key: key, list: list };
  return list;
}
/** 帧延时：导入的按文件自己的，预设的按 fps（原版默认 10） */
function mkFrameDelay (src, fps) {
  if (src && src.frames && src.frames.length && src.delay) return src.delay;
  return Math.round(1000 / (fps || 10));
}
/** 每一帧各停多久（毫秒）：导入的按文件自己的逐帧延时，生成的按 fps 基准，再乘上逐帧倍数 */
function mkFrameDelays (src) {
  const list = mkSourceFrames(src);
  const n = list ? list.length : 1;
  if (n < 2) return [160];
  const own = (src && src.delays && src.delays.length === n) ? src.delays : null;
  const w = (src && src.weights && src.weights.length === n) ? src.weights : null;
  const baseMs = own ? 0 : Math.round(1000 / ((src && src.gen && src.gen.fps) || 10));
  const out = [];
  for (let i = 0; i < n; i++) {
    const d = own ? Math.max(10, own[i] || own[0]) : baseMs;
    out.push(Math.max(10, Math.round(d * ((w && w[i]) || 1) * (src.speed || 1))));   /* speed = 播放速度倍率（越大越慢） */
  }
  return out;
}
/** 预览用：第 frameIndex 帧该停多久 */
function mkFrameDelayAt (src, frameIndex, fallback) {
  const list = mkSourceFrames(src);
  const n = list ? list.length : 1;
  if (n < 2) return fallback || 160;
  const d = mkFrameDelays(src);
  return d[frameIndex % n] || fallback || 160;
}
/** 导出 Lua 用的动图三件套：最小延时当基准 → fps；其余帧换算成整数倍数（只有非均匀时才写） */
function mkAnimArgs (src) {
  const list = mkSourceFrames(src);
  const n = list ? list.length : 1;
  if (n < 2) return null;
  const d = mkFrameDelays(src);
  const min = Math.min.apply(null, d);
  const mult = d.map((x) => Math.max(1, Math.min(99, Math.round(x / min))));
  const uniform = mult.every((x) => x === mult[0]);
  return { n: n, fps: Math.max(1, Math.min(60, Math.round(1000 / min))), frame_durations: uniform ? null : mult, baseMs: min };
}
/** 逐帧时长那一行的说明：现在各帧是不是一样长、哪些更慢 */
function mkWeightHintText () {
  const d = mkFrameDelays(MK.art);
  if (d.length < 2) return "";
  const min = Math.min.apply(null, d);
  const kinds = new Set(d).size;
  if (kinds < 2) return "现在每帧一样长（" + d[0] + "ms）。想让某几帧慢一点，就把它的倍数调大。";
  const slow = d.map((x, i) => [i + 1, x]).filter((p) => p[1] > min).map((p) => "第 " + p[0] + " 帧 " + (p[1] / min).toFixed(1) + "×");
  return "现在有 " + kinds + " 种时长（基准 " + min + "ms）：" + slow.slice(0, 8).join("、") + (slow.length > 8 ? " …" : "") + "。导出会写进 sprite_args.frame_durations。";
}
/** 动效那一行下面的说明，跟着当前状态走 */
function mkMotionHintText () {
  const g = MK.art.gen || {};
  if (!g.kind || !(g.n > 1)) {
    const fl = mkSourceFrames(MK.art);
    return fl ? ("主体现在用导入的 " + fl.length + " 帧（每帧 " + (MK.art.delay || "?") + "ms）。") : "主体现在是静态的：可以导入动图、多选几张图当帧，或选一个动效预设让它自己动起来。";
  }
  return "主体按「" + mkMotionName(g.kind) + "」生成 " + g.n + " 帧 · " + g.fps + "fps · 幅度 " + g.amp + "：预览在动，导出会铺成横向帧序列（Lua 写 ANIMATION_ATLAS + frames + fps）。";
}
function mkSheetCanvas (scale, which) {
  const src = which === 'soul' ? MK.soul : MK.art;
  const list = mkSourceFrames(src);
  const frames = list ? list.length : 1;   /* 帧数：导入的帧序列，或按预设现场生成的帧。这里要的是帧数，不是帧数组 */
  const cv = newCanvas(Math.round(CARD_W * scale * frames), Math.round(CARD_H * scale));
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  for (let i = 0; i < frames; i++) {
    const one = list ? list[i] : null;
    if (one) mkDrawSource(ctx, scale, i * CARD_W * scale, 0, { atlas: src.atlas, pos: src.pos, upload: one });
    else mkDrawSource(ctx, scale, i * CARD_W * scale, 0, src);
  }
  return cv;
}
function mkArtCanvas (scale) { return mkSheetCanvas(scale, 'art') }
function mkSoulSheetCanvas (scale) { return mkSheetCanvas(scale, 'soul') }
function mkOldArtCanvas (scale) {
  const px = CARD_W * scale, py = CARD_H * scale;
  const cv = newCanvas(Math.round(px), Math.round(py));
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  if (MK.art.upload) {
    const r = Math.min(cv.width / MK.art.upload.width, cv.height / MK.art.upload.height);
    const w = MK.art.upload.width * r, h = MK.art.upload.height * r;
    ctx.drawImage(MK.art.upload, (cv.width - w) / 2, (cv.height - h) / 2, w, h);
    return cv;
  }
  const a = D.atlases[MK.art.atlas];
  if (!a) return cv;
  const src = IMG[a.file];
  const s = a.scale || 1;
  const sx = MK.art.pos.x * a.px * s, sy = MK.art.pos.y * a.py * s, sw = a.px * s, sh = a.py * s;
  try { ctx.drawImage(src, sx, sy, sw, sh, 0, 0, cv.width, cv.height) } catch (e) { /* 图没解码完就留空 */ }
  return cv;
}
/** 预览：原版卡图（中心框 + 贴图），和合成台一样的方式 */
/** 读一张图：静态返回 1 帧，GIF / APNG / 动图 WebP 用 ImageDecoder 拆帧（最多 24 帧） */
/* ---------------------------------------------------------------- GIF 帧解析
 * 自己写的 GIF89a 解析（纯计算，不碰 canvas / DOM / Node 的 API），所以同一份代码
 * 在浏览器里能跑、在 Node 里也能拿来做回归测试。
 * 为什么不用 ImageDecoder：那是内核功能，版本不对/无头环境下给不出多帧，
 * "上传动图"就会看起来完全没反应。这里块解析 + LZW 解压 + 按 disposal 合成每一帧。
 * 返回 [{ rgba: Uint8ClampedArray(w*h*4), width, height, delay }]，最多 maxFrames 帧；
 * 不是 GIF 或解不出任何帧时返回 null。 */
function gifDecodeFrames (bytes, maxFrames) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  if (u8.length < 13) return null
  const sig = String.fromCharCode(u8[0], u8[1], u8[2], u8[3], u8[4], u8[5])
  if (sig !== 'GIF87a' && sig !== 'GIF89a') return null
  let p = 6
  const u16 = () => { const v = u8[p] | (u8[p + 1] << 8); p += 2; return v }
  const sw = u16()
  const sh = u16()
  if (!sw || !sh) return null
  const flags = u8[p++]
  p += 2                                   /* 背景色索引 + 像素宽高比 */
  let gct = null
  let gctN = 0
  if (flags & 0x80) { gctN = 2 << (flags & 7); gct = u8.subarray(p, p + gctN * 3); p += gctN * 3 }

  const limit = Math.max(1, maxFrames || 24)
  const out = []
  /* 画面缓冲：整张逻辑屏，RGBA。disposal 合成都在这份缓冲上做 */
  let screen = new Uint8ClampedArray(sw * sh * 4)
  let gce = { delay: 80, transparent: -1, disposal: 0 }

  const skipBlocks = () => { while (p < u8.length && u8[p] !== 0) p += u8[p] + 1; p++ }

  /** 把一段（已拼好的）LZW 数据解成索引，写进 px（RGBA，尺寸 w×h） */
  const lzwToRGBA = (minCode, data, px, w, h, pal, transparent) => {
    const clear = 1 << minCode
    const end = clear + 1
    let size = minCode + 1
    let next = end + 1
    let dict = null
    let bitPos = 0
    const reset = () => {
      dict = new Array(4096)
      for (let i = 0; i < clear; i++) dict[i] = [i]
      dict[clear] = null
      dict[end] = null
      size = minCode + 1
      next = end + 1
    }
    reset()
    const readCode = () => {
      let v = 0
      for (let i = 0; i < size; i++) {
        const byte = data[bitPos >> 3]
        if (byte === undefined) return -1
        v |= ((byte >> (bitPos & 7)) & 1) << i
        bitPos++
      }
      return v
    }
    const put = (paletteIndex, pos) => {
      const o = pos * 4
      if (paletteIndex === transparent) { px[o] = 0; px[o + 1] = 0; px[o + 2] = 0; px[o + 3] = 0; return }
      const ci = paletteIndex * 3
      px[o] = pal[ci]
      px[o + 1] = pal[ci + 1]
      px[o + 2] = pal[ci + 2]
      px[o + 3] = 255
    }
    let pos = 0
    let prev = -1
    for (;;) {
      const code = readCode()
      if (code < 0) return pos
      if (code === clear) { reset(); prev = -1; continue }
      if (code === end) return pos
      let entry
      if (prev === -1) {
        if (code >= clear) return pos           /* 第一码必须是字面量 */
        entry = dict[code]
      } else if (code < next && dict[code]) {
        entry = dict[code]
      } else if (code === next && dict[prev]) {
        entry = dict[prev].concat(dict[prev][0])
      } else {
        return pos                              /* 码流坏了，能画多少算多少 */
      }
      if (prev !== -1 && next < 4096 && dict[prev]) {
        dict[next++] = dict[prev].concat(entry[0])
        if (next === (1 << size) && size < 12) size++
      }
      prev = code
      for (let i = 0; i < entry.length; i++) {
        if (pos < w * h) put(entry[i], pos)
        pos++
        if (pos >= w * h) return pos
      }
    }
  }

  while (p < u8.length) {
    const b = u8[p++]
    if (b === 0x21) {                                    /* 扩展块 */
      const label = u8[p++]
      if (label === 0xF9) {
        const size = u8[p++]
        const packed = u8[p]
        gce = {
          delay: Math.max(20, (u8[p + 1] | (u8[p + 2] << 8)) * 10 || 80),
          transparent: (packed & 1) ? u8[p + 3] : -1,
          disposal: (packed >> 2) & 7,
        }
        p += size
        skipBlocks()
      } else {
        skipBlocks()
      }
    } else if (b === 0x2C) {                             /* 图像块 */
      const ix = u16()
      const iy = u16()
      const iw = u16()
      const ih = u16()
      if (!iw || !ih) break
      const pf = u8[p++]
      let pal = gct
      if (pf & 0x80) { const n = 2 << (pf & 7); pal = u8.subarray(p, p + n * 3); p += n * 3 }
      if (!pal) break
      const minCode = u8[p++]
      const chunks = []
      let total = 0
      while (p < u8.length && u8[p] !== 0) { const len = u8[p]; p++; chunks.push(u8.subarray(p, p + len)); total += len; p += len }
      p++
      const data = new Uint8Array(total)
      let off = 0
      for (const c of chunks) { data.set(c, off); off += c.length }
      const keep = gce.disposal === 3 ? screen.slice() : null
      const px = new Uint8ClampedArray(iw * ih * 4)
      lzwToRGBA(minCode, data, px, iw, ih, pal, gce.transparent)
      /* 把这一格贴到逻辑屏上：透明像素不覆盖底下的画面 */
      for (let y = 0; y < ih; y++) {
        const sy = iy + y
        if (sy < 0 || sy >= sh) continue
        for (let x = 0; x < iw; x++) {
          const sx = ix + x
          if (sx < 0 || sx >= sw) continue
          const a = px[(y * iw + x) * 4 + 3]
          if (!a) continue
          const s = (y * iw + x) * 4
          const t = (sy * sw + sx) * 4
          screen[t] = px[s]
          screen[t + 1] = px[s + 1]
          screen[t + 2] = px[s + 2]
          screen[t + 3] = 255
        }
      }
      out.push({ rgba: screen.slice(), width: sw, height: sh, delay: gce.delay })
      if (out.length >= limit) break
      if (gce.disposal === 2) {                          /* 还原成背景色（这里按透明处理） */
        for (let y = 0; y < ih; y++) {
          const sy = iy + y
          if (sy < 0 || sy >= sh) continue
          for (let x = 0; x < iw; x++) {
            const sx = ix + x
            if (sx < 0 || sx >= sw) continue
            const t = (sy * sw + sx) * 4
            screen[t] = 0; screen[t + 1] = 0; screen[t + 2] = 0; screen[t + 3] = 0
          }
        }
      } else if (gce.disposal === 3 && keep) {
        screen = keep
      }
      gce = { delay: 80, transparent: -1, disposal: 0 }
    } else if (b === 0x3B) {                             /* 结束 */
      break
    } else {
      break
    }
  }
  return out.length ? out : null
}

/** 解出来的 RGBA 变成 canvas（导出、预览都直接用 canvas） */
function mkFramesToCanvases (list) {
  return list.map((f) => {
    const cv = newCanvas(f.width, f.height);
    const ctx = cv.getContext("2d");
    const img = ctx.createImageData(f.width, f.height);
    img.data.set(f.rgba);
    ctx.putImageData(img, 0, 0);
    return cv;
  });
}
/** GIF 字节 → { frames: [canvas], delay }；不是 GIF / 解不出来返回 null */
function mkGifFrames (bytes, max) {
  try {
    const g = gifDecodeFrames(bytes, max || 24);
    if (!g || !g.length) return null;
    return { frames: mkFramesToCanvases(g), delay: g[0].delay, delays: g.map((f) => f.delay), total: g.length };
  } catch (e) { return null }
}
/* ---------------------------------------------------------------- APNG 帧解析
 * 和 gifdec.js 一样：纯计算，不碰 canvas / DOM；唯一的外部依赖是「解 zlib」这一步，
 * 由调用方注入（浏览器用 DecompressionStream('deflate')，Node 用 zlib.inflateSync）。
 * 为什么不用内核的 ImageDecoder：实测这台机器的 Chrome 根本没有这个接口，
 * APNG 上传就只会拿到第一帧、看着像"不支持动图"。
 *
 * 支持：8 位色深的 colorType 0/2/3/4/6（灰/真彩/调色板/灰+透明/真彩+透明）、
 *      PLTE 与 tRNS、逐帧子矩形、dispose（0 不处理 / 1 抹成透明 / 2 还原上一帧）、
 *      blend（0 覆盖 / 1 alpha 叠加）。
 * 不支持：16 位色深、隔行扫描（Adam7）—— 这两种直接返回 null，让调用方回退到「按第一帧用」。
 * 返回 [{ rgba: Uint8ClampedArray(w*h*4), width, height, delay }]，最多 maxFrames 帧；
 * 不是 APNG / 解不出来时返回 null。 */
function apngDecodeFrames (bytes, maxFrames, inflate) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  const SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (u8.length < 20) return Promise.resolve(null)
  for (let i = 0; i < 8; i++) if (u8[i] !== SIG[i]) return Promise.resolve(null)

  let p = 8
  const u32 = (o) => ((u8[o] << 24) | (u8[o + 1] << 16) | (u8[o + 2] << 8) | u8[o + 3]) >>> 0
  const u16 = (o) => (u8[o] << 8) | u8[o + 1]
  const rd16 = (b, o) => (b[o] << 8) | b[o + 1]
  const rd32 = (b, o) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0

  let ihdr = null
  let plte = null
  let trns = null
  let declaredFrames = 0
  const frames = []
  const idat = []
  let seenIdat = false
  let firstCtlBeforeIdat = false

  while (p + 8 <= u8.length) {
    const len = u32(p)
    const type = String.fromCharCode(u8[p + 4], u8[p + 5], u8[p + 6], u8[p + 7])
    const data = u8.subarray(p + 8, p + 8 + len)
    p += 12 + len                                  /* 长度 + 类型 + 数据 + CRC */
    if (type === 'IHDR') {
      if (data.length < 13) return Promise.resolve(null)
      ihdr = {
        w: rd32(data, 0), h: rd32(data, 4),
        bitDepth: data[8], colorType: data[9],
        compression: data[10], filter: data[11], interlace: data[12],
      }
    } else if (type === 'acTL') {
      declaredFrames = rd32(data, 0)
    } else if (type === 'PLTE') {
      plte = data
    } else if (type === 'tRNS') {
      trns = data
    } else if (type === 'fcTL') {
      if (data.length < 26) return Promise.resolve(null)
      const ctl = {
        seq: rd32(data, 0), w: rd32(data, 4), h: rd32(data, 8), x: rd32(data, 12), y: rd32(data, 16),
        dNum: rd16(data, 20), dDen: rd16(data, 22), dispose: data[24], blend: data[25],
      }
      frames.push({ ctl: ctl, chunks: [] })
      if (!seenIdat && frames.length === 1) firstCtlBeforeIdat = true
    } else if (type === 'fdAT') {
      if (!frames.length || data.length < 4) return Promise.resolve(null)
      frames[frames.length - 1].chunks.push(data.subarray(4))
    } else if (type === 'IDAT') {
      idat.push(data)
      seenIdat = true
    } else if (type === 'IEND') {
      break
    }
  }

  if (!ihdr) return Promise.resolve(null)
  /* 没有 acTL / 只有一个 fcTL → 就是普通 PNG，交给调用方走静态那条路 */
  if (!declaredFrames || frames.length < 2) return Promise.resolve(null)
  const depth = ihdr.bitDepth
  /* 8 位全支持；1/2/4 位只有「灰度」与「调色板」是合法组合（真彩/带 alpha 只能是 8 或 16 位）。
     upng-js 这类工具默认就会产出 4 位调色板 APNG，所以这几种必须认。 */
  const depthOk = depth === 8 || ((ihdr.colorType === 0 || ihdr.colorType === 3) && (depth === 1 || depth === 2 || depth === 4))
  if (!depthOk || ihdr.interlace !== 0) return Promise.resolve(null)   /* 16 位 / 隔行：不装懂 */
  if (ihdr.colorType === 3 && !plte) return Promise.resolve(null)

  const chanOf = (ct) => (ct === 0 ? 1 : ct === 2 ? 3 : ct === 3 ? 1 : ct === 4 ? 2 : 4)
  const chan = chanOf(ihdr.colorType)
  if (!chan) return Promise.resolve(null)
  const bitsPerPx = chan * depth
  const strideOf = (w) => Math.ceil(w * bitsPerPx / 8)      /* 一行多少字节（1/2/4 位是打包的） */
  const filterBpp = Math.max(1, Math.ceil(bitsPerPx / 8))   /* 滤波按字节算，最少 1 */
  /* 第一帧的数据放在 IDAT 里（标准写法）；有些工具会把 IDAT 当静态图、不给它 fdAT，
     所以只要第一帧自己没有 fdAT 数据，就用 IDAT —— 两种写法都能读 */
  if (frames[0].chunks.length === 0 && idat.length) frames[0].chunks = idat

  const W = ihdr.w; const H = ihdr.h
  const limit = Math.max(1, Math.min(frames.length, maxFrames || 24))

  const unfilter = (raw, w, h) => {
    const stride = strideOf(w)
    if (!raw || raw.length < (stride + 1) * h) return null
    const out = new Uint8Array(stride * h)
    let prev = null
    for (let y = 0; y < h; y++) {
      const ft = raw[y * (stride + 1)]
      const off = y * (stride + 1) + 1
      const row = out.subarray(y * stride, (y + 1) * stride)
      for (let x = 0; x < stride; x++) {
        const a = x >= filterBpp ? row[x - filterBpp] : 0
        const b = prev ? prev[x] : 0
        const c = (prev && x >= filterBpp) ? prev[x - filterBpp] : 0
        let v = raw[off + x]
        if (ft === 0) { /* 原样 */ } else if (ft === 1) { v = (v + a) & 255 } else if (ft === 2) { v = (v + b) & 255 } else if (ft === 3) {
          v = (v + ((a + b) >> 1)) & 255
        } else if (ft === 4) {
          const pp = a + b - c
          const pa = Math.abs(pp - a); const pb = Math.abs(pp - b); const pc = Math.abs(pp - c)
          v = (v + ((pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c))) & 255
        } else { return null }
        row[x] = v
      }
      prev = row
    }
    return out
  }

  /** 取第 i 个样本：8 位直接取字节，1/2/4 位是打包的（每字节高位在前） */
  const sample = (rows, i) => {
    if (depth === 8) return rows[i]
    const perByte = 8 / depth
    const byte = rows[Math.floor(i / perByte)]
    const shift = 8 - depth * ((i % perByte) + 1)
    return (byte >> shift) & ((1 << depth) - 1)
  }
  const toGray = (v) => (depth === 8 ? v : Math.round(v * 255 / ((1 << depth) - 1)))

  /** 行序样本 → RGBA（按 colorType / 调色板展开） */
  const toRGBA = (rows, w, h) => {
    const rgba = new Uint8ClampedArray(w * h * 4)
    for (let i = 0; i < w * h; i++) {
      const o = i * 4
      if (ihdr.colorType === 6) {
        rgba[o] = rows[i * 4]; rgba[o + 1] = rows[i * 4 + 1]; rgba[o + 2] = rows[i * 4 + 2]; rgba[o + 3] = rows[i * 4 + 3]
      } else if (ihdr.colorType === 2) {
        rgba[o] = rows[i * 3]; rgba[o + 1] = rows[i * 3 + 1]; rgba[o + 2] = rows[i * 3 + 2]; rgba[o + 3] = 255
      } else if (ihdr.colorType === 0) {
        const g = toGray(sample(rows, i)); rgba[o] = g; rgba[o + 1] = g; rgba[o + 2] = g; rgba[o + 3] = 255
      } else if (ihdr.colorType === 4) {
        const g = rows[i * 2]; rgba[o] = g; rgba[o + 1] = g; rgba[o + 2] = g; rgba[o + 3] = rows[i * 2 + 1]
      } else {
        const idx = sample(rows, i)
        rgba[o] = plte[idx * 3]; rgba[o + 1] = plte[idx * 3 + 1]; rgba[o + 2] = plte[idx * 3 + 2]
        rgba[o + 3] = (trns && idx < trns.length) ? trns[idx] : 255
      }
    }
    return rgba
  }

  /** 把一帧画到画布上（blend 1 = alpha 叠加，其余按覆盖） */
  const drawInto = (canvas, ctl, px, blend) => {
    for (let y = 0; y < ctl.h; y++) {
      const dy = ctl.y + y
      if (dy < 0 || dy >= H) continue
      for (let x = 0; x < ctl.w; x++) {
        const dx = ctl.x + x
        if (dx < 0 || dx >= W) continue
        const s = (y * ctl.w + x) * 4
        const t = (dy * W + dx) * 4
        const sa = px[s + 3]
        if (blend === 1 && sa !== 255) {
          if (sa === 0) continue
          const da = canvas[t + 3]
          if (da === 0) {
            canvas[t] = px[s]; canvas[t + 1] = px[s + 1]; canvas[t + 2] = px[s + 2]; canvas[t + 3] = sa
          } else {
            const sf = sa / 255; const df = da / 255 * (1 - sf)
            const af = sf + df
            canvas[t] = Math.round((px[s] * sf + canvas[t] * df) / af)
            canvas[t + 1] = Math.round((px[s + 1] * sf + canvas[t + 1] * df) / af)
            canvas[t + 2] = Math.round((px[s + 2] * sf + canvas[t + 2] * df) / af)
            canvas[t + 3] = Math.round(af * 255)
          }
        } else {
          canvas[t] = px[s]; canvas[t + 1] = px[s + 1]; canvas[t + 2] = px[s + 2]; canvas[t + 3] = sa
        }
      }
    }
  }
  const clearRect = (canvas, ctl) => {
    for (let y = 0; y < ctl.h; y++) {
      const dy = ctl.y + y
      if (dy < 0 || dy >= H) continue
      for (let x = 0; x < ctl.w; x++) {
        const dx = ctl.x + x
        if (dx < 0 || dx >= W) continue
        const t = (dy * W + dx) * 4
        canvas[t] = 0; canvas[t + 1] = 0; canvas[t + 2] = 0; canvas[t + 3] = 0
      }
    }
  }

  const out = []
  let canvas = new Uint8ClampedArray(W * H * 4)
  let chain = Promise.resolve()
  for (let i = 0; i < limit; i++) {
    const f = frames[i]
    chain = chain.then(() => {
      const parts = f.chunks
      let total = 0
      for (const c of parts) total += c.length
      const z = new Uint8Array(total)
      let off = 0
      for (const c of parts) { z.set(c, off); off += c.length }
      return Promise.resolve(inflate(z)).then((raw) => {
        const rows = unfilter(raw, f.ctl.w, f.ctl.h)
        if (!rows) throw new Error('第 ' + (i + 1) + ' 帧的像素数据解不开')
        const px = toRGBA(rows, f.ctl.w, f.ctl.h)
        const keep = f.ctl.dispose === 2 ? canvas.slice() : null
        const den = f.ctl.dDen || 100
        const delay = Math.max(10, Math.min(2000, Math.round(f.ctl.dNum * 1000 / den) || 80))
        drawInto(canvas, f.ctl, px, i === 0 ? 0 : f.ctl.blend)
        out.push({ rgba: canvas.slice(), width: W, height: H, delay: delay })
        if (f.ctl.dispose === 1) clearRect(canvas, f.ctl)
        else if (f.ctl.dispose === 2 && keep) canvas = keep
      })
    })
  }
  return chain.then(() => (out.length ? out : null), () => (out.length ? out : null))
}

/** 浏览器端解 zlib（APNG 每一帧的数据都是一条独立的 zlib 流） */
async function mkInflateZlib (u8) {
  if (typeof DecompressionStream === "undefined") throw new Error("这个浏览器没有 DecompressionStream，拆不了 APNG");
  const stream = new Blob([u8]).stream().pipeThrough(new DecompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
/** APNG 字节 → { frames: [canvas], delay }；静态 PNG / 解不出来返回 null */
async function mkApngFrames (bytes, max) {
  try {
    const g = await apngDecodeFrames(bytes, max || 24, mkInflateZlib);
    if (!g || !g.length) return null;
    return { frames: mkFramesToCanvases(g), delay: g[0].delay, delays: g.map((f) => f.delay), total: g.length };
  } catch (e) { return null }
}
async function mkReadImage (file) {
  const url = URL.createObjectURL(file);
  try {
    /* ① GIF：先用自己的解析器 —— 不挑内核，ImageDecoder 没有/拆不出多帧时也能拆 */
    const isGif = /gif/i.test(file.type || '') || /\.gif$/i.test(file.name || '');
    if (isGif) {
      const g = mkGifFrames(new Uint8Array(await file.arrayBuffer()), 24);
      if (g && g.frames.length > 1) { URL.revokeObjectURL(url); return { frames: g.frames, cover: g.frames[0], delay: g.delay, delays: g.delays, gif: true } }
      if (g && g.frames.length === 1) { URL.revokeObjectURL(url); return { frames: g.frames, cover: g.frames[0], delay: g.delay, gif: true, single: true } }
    }
    /* ② APNG：也自己解（acTL / fcTL / fdAT + 帧合成）；普通 PNG 会返回 null，照旧走静态那条路 */
    const isPng = /png/i.test(file.type || '') || /\.png$/i.test(file.name || '');
    if (isPng) {
      const a = await mkApngFrames(new Uint8Array(await file.arrayBuffer()), 24);
      if (a && a.frames.length > 1) { URL.revokeObjectURL(url); return { frames: a.frames, cover: a.frames[0], delay: a.delay, delays: a.delays, apng: true } }
      if (a && a.frames.length === 1) { URL.revokeObjectURL(url); return { frames: a.frames, cover: a.frames[0], delay: a.delay, apng: true, single: true } }
    }
    /* ③ 动图 WebP：这个只能靠内核的 ImageDecoder（没有它就只能按第一帧用，界面上会说实话） */
    if (typeof ImageDecoder !== 'undefined' && /webp$/i.test(file.type)) {
      try {
        const dec = new ImageDecoder({ data: await file.arrayBuffer(), type: file.type || 'image/png' });
        await dec.completed;
        const total = Math.min(dec.tracks.selectedTrack ? dec.tracks.selectedTrack.frameCount : 1, 24);
        if (total > 1) {
          const frames = [];
          for (let i = 0; i < total; i++) {
            const r = await dec.decode({ frameIndex: i });
            const bmp = r.image;
            const cv = newCanvas(bmp.displayWidth || bmp.codedWidth, bmp.displayHeight || bmp.codedHeight);
            cv.getContext("2d").drawImage(bmp, 0, 0);
            frames.push(cv);
            bmp.close && bmp.close();
          }
          URL.revokeObjectURL(url);
          return { frames, cover: frames[0] };
        }
      } catch (e) { /* 不是动图或解码器不认，退回静态 */ }
    }
    const im = await new Promise((res, rej) => { const i2 = new Image(); i2.onload = () => res(i2); i2.onerror = rej; i2.src = url });
    URL.revokeObjectURL(url);
    return { frames: [im], cover: im };
  } catch (e) { URL.revokeObjectURL(url); return null }
}
/** 悬浮立绘的图：和主体用同一套取图方式，只是图集/坐标换成 soul 那一份 */
function mkSoulCanvas (scale) {
  const keep = MK.art;
  MK.art = { atlas: MK.soul.atlas, pos: MK.soul.pos, upload: MK.soul.upload, uploadName: MK.soul.uploadName };
  const cv = mkArtCanvas(scale);
  MK.art = keep;
  return cv;
}
/** 预览：有上传（或动图）时直接画那张图/那一帧；否则用原版图集那一格 */
function mkPreviewCanvas () {
  /* 主体：有帧序列（导入的或按预设生成的）就画当前那一帧，否则用原版图集那一格合成整张卡 */
  const artFrames = mkSourceFrames(MK.art);
  const artSrc = artFrames ? artFrames[mkFrame % artFrames.length] : (MK.art.upload || null);
  let base = null;
  if (artSrc) {
    base = newCanvas(CARD_W * 2, CARD_H * 2);
    mkDrawSource(base.getContext('2d'), 2, 0, 0, { atlas: MK.art.atlas, pos: MK.art.pos, upload: artSrc });
  } else {
    const spec = { standalone: { atlas: MK.art.atlas, pos: MK.art.pos } };
    try { base = compose(spec, 2) } catch (e) { base = mkArtCanvas(2) }
  }
  /* 悬浮立绘：游戏里它是独立的一层前景精灵、一直在飘（soul_atlas / floating_sprite），
     所以不管主体是合成的还是自己上传的，都该叠上去。 */
  if (MK.type === 'Joker' && MK.soul.on) {
    const soulFrames = mkSourceFrames(MK.soul);
    const soulSrc = soulFrames ? soulFrames[mkFrame % soulFrames.length] : (MK.soul.upload || null);
    const cv = newCanvas(CARD_W * 2, CARD_H * 2);
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(base, 0, 0);
    const bob = Math.sin((mkFrame % 60) / 60 * Math.PI * 2) * 4;
    const w = CARD_W * 2 * 0.86, h = CARD_H * 2 * 0.86;
    const layer = newCanvas(Math.round(w), Math.round(h));
    mkDrawSource(layer.getContext('2d'), w / CARD_W, 0, 0, { atlas: MK.soul.atlas, pos: MK.soul.pos, upload: soulSrc || null });
    ctx.drawImage(layer, (CARD_W * 2 - w) / 2, (CARD_H * 2 - h) / 2 - 6 + bob, w, h);
    return cv;
  }
  return base;
}
let mkFrame = 0;
let mkAnimTimer = null;
let mkAnimDelay = 160;
/** 预览里的动图：按图片自己的帧延时换帧（GIF 里写多少就多少，限制在 40–500ms）
 *  —— 立绘有帧序列或者开着浮动时也靠这个计时器，所以两种情况都要让它跑起来。 */
function mkStartAnim (delay) {
  mkAnimDelay = Math.min(500, Math.max(40, Math.round(delay) || 160));
  if (mkAnimTimer) { clearInterval(mkAnimTimer); mkAnimTimer = null }   /* 换图就按新延时重建 */
  const tick = () => {
    const box = document.querySelector('.mkpvbox');
    if (!box || !box.isConnected) { clearInterval(mkAnimTimer); mkAnimTimer = null; return }
    const aList = mkSourceFrames(MK.art);
    const aN = aList ? aList.length : 1;
    const soulAlive = MK.type === 'Joker' && MK.soul.on;   /* 立绘开着就一直重画：它本身就在飘 */
    const sList = soulAlive ? mkSourceFrames(MK.soul) : null;
    const sN = sList ? sList.length : 1;
    const total = Math.max(aN, sN);
    mkFrame = (mkFrame + 1) % (total * 60);      /* 前 60 步给立绘浮动留相位，同时保证帧序走满一圈 */
    if (total >= 2 || soulAlive) {
      const old = box.querySelector("canvas");
      const cv = mkPreviewCanvas();
      cv.style.width = '142px'; cv.style.height = '190px';
      if (old) box.replaceChild(cv, old); else box.appendChild(cv);
    }
    /* 每一帧停多久：主体有帧就用主体的逐帧时长，否则看立绘，都没有就用传入的兜底延时 */
    const tickSrc = aN > 1 ? MK.art : (sN > 1 ? MK.soul : null);
    const wait = tickSrc ? mkFrameDelayAt(tickSrc, mkFrame, mkAnimDelay) : mkAnimDelay;
    mkAnimTimer = setTimeout(tick, Math.max(30, Math.min(2000, wait)));
  };
  mkAnimTimer = setTimeout(tick, mkAnimDelay);
}
function mkCondSnippet (e) {
  const v = e.condVal;
  if (e.cond === 'suit') return "context.other_card:is_suit('" + v + "')";
  if (e.cond === 'rank') return 'context.other_card:get_id() == ' + ({ Jack: 11, Queen: 12, King: 13, Ace: 14 }[v] || v);
  if (e.cond === 'face') return 'context.other_card:is_face()';
  if (e.cond === 'hand') return "context.scoring_name == '" + v + "'";
  if (e.cond === 'count') return '#' + 'context.full_hand >= ' + (v || 5);
  if (e.cond === 'enh') return "context.other_card.config.center.key == '" + (v || 'm_bonus') + "'";
  if (e.cond === 'even') return 'context.other_card:get_id() <= 10 and context.other_card:get_id() % 2 == 0';
  if (e.cond === 'odd') return '(context.other_card:get_id() % 2 == 1 or context.other_card:get_id() == 14)';
  if (e.cond === 'edition') return "context.other_card.edition and context.other_card.edition.key == '" + (v || 'e_foil') + "'";
  if (e.cond === 'seal') return "context.other_card.seal == '" + (v || 'Red') + "'";
  if (e.cond === 'deckcount') return '#G.playing_cards >= ' + (v || 40);
  return '';
}
/** 一行效果 → Lua 片段 */
function mkEffectLua (e) {
  const val = Number(e.val) || 0;
  const eff = e.eff === 'chips' ? 'chips = ' + val
    : e.eff === 'mult' ? 'mult = ' + val
      : e.eff === 'xmult' ? 'x_mult = ' + (val || 1)
        : e.eff === 'dollars' ? 'dollars = ' + val
          : e.eff === 'hands' ? 'hands = ' + (val || 1)
            : e.eff === 'discards' ? 'discards = ' + (val || 1)
              : e.eff === 'handsize' ? 'h_size = ' + (val || 1)
                : e.eff === 'tarot' ? "create_card('Tarot', G.play)"
                  : e.eff === 'planet' ? "create_card('Planet', G.play)"
                    : e.eff === 'levelup' ? 'level_up = true'
                      : e.eff === 'joker' ? "create_card('Joker', G.play)"
                        : 'repetitions = ' + (val || 1);
  const cond = mkCondSnippet(e);
  const lines = [];
  if (e.when === 'card') {
    lines.push('if context.cardarea == G.play and context.individual then');
    if (cond) lines.push('    if ' + cond + ' then');
    lines.push((cond ? '        ' : '    ') + 'return { ' + eff + ' }');
    if (cond) lines.push('    end');
    lines.push('end');
  } else if (e.when === 'hand') {
    lines.push('if context.cardarea == G.play and not context.individual then');
    lines.push('    return { ' + eff + ' }');
    lines.push('end');
  } else if (e.when === 'held') {
    lines.push('if context.cardarea == G.hand and context.individual then');
    if (cond) lines.push('    if ' + cond + ' then');
    lines.push((cond ? '        ' : '    ') + 'return { ' + eff + ' }');
    if (cond) lines.push('    end');
    lines.push('end');
  } else if (e.when === 'repetition') {
    lines.push('if context.repetition and context.cardarea == G.play then');
    if (cond) lines.push('    if ' + cond + ' then');
    lines.push((cond ? '        ' : '    ') + 'return { ' + eff + ' }');
    if (cond) lines.push('    end');
    lines.push('end');
  } else if (e.when === 'discard') {
    lines.push('if context.discard then');
    lines.push('    return { ' + eff + ' }');
    lines.push('end');
  } else if (e.when === 'independent') {
    lines.push('if context.independent then');
    lines.push('    return { ' + eff + ' }');
    lines.push('end');
  } else if (e.when === 'sell') {
    lines.push('if context.sell then');
    lines.push('    return { ' + eff + ' }');
    lines.push('end');
  }
  return lines.join('\n');
}
function mkCondText (e) {
  const v = e.condVal;
  if (e.cond === 'suit') return (MK_SUITS.filter((s) => s[0] === v)[0] || [v, v])[1];
  if (e.cond === 'rank') return (MK_RANKS.filter((r) => r[0] === v)[0] || [v, v])[1] + ' 点';
  if (e.cond === 'face') return '人头牌（J/Q/K）';
  if (e.cond === 'hand') return '「' + (handCN({ name: v }) || v) + '」';
  if (e.cond === 'count') return '这一手至少 ' + (v || 5) + ' 张';
  if (e.cond === 'enh') return '「' + ((MK_ENH.filter((x) => x[0] === v)[0] || [v, v])[1]) + '」强化';
  if (e.cond === 'even') return '偶数点数';
  if (e.cond === 'odd') return '奇数点数';
  if (e.cond === 'edition') return '「' + ((MK_EDITION.filter((x) => x[0] === v)[0] || [v, v])[1]) + '」版本';
  if (e.cond === 'seal') return '「' + ((MK_SEAL.filter((x) => x[0] === v)[0] || [v, v])[1]) + '」';
  if (e.cond === 'deckcount') return '牌堆里至少 ' + (v || 40) + ' 张';
  return '';
}
function mkEffText (e) {
  const val = Number(e.val) || 0;
  if (e.eff === 'chips') return '+' + val + ' 筹码';
  if (e.eff === 'mult') return '+' + val + ' 倍率';
  if (e.eff === 'xmult') return '×' + (val || 1) + ' 倍率';
  if (e.eff === 'dollars') return '+$' + val;
  if (e.eff === 'hands') return '出牌次数 +' + (val || 1);
  if (e.eff === 'discards') return '弃牌次数 +' + (val || 1);
  if (e.eff === 'handsize') return '手牌上限 +' + (val || 1);
  if (e.eff === 'tarot') return '给一张随机塔罗';
  if (e.eff === 'planet') return '给一张随机星球';
  if (e.eff === 'levelup') return '升级打出的牌型';
  if (e.eff === 'joker') return '给一张随机小丑牌';
  return '再多结算 ' + (val || 1) + ' 次';
}
function mkWhenText (e) {
  return (MK_WHEN.filter((w) => w[0] === e.when)[0] || ['', e.when])[1];
}
/** 描述文字：按选的效果自动拼（也可以手改） */
function mkAutoText (lang) {
  if (MK.type !== 'Joker') {
    const lines = mkTypeSummaryText();
    return lines.join(lang === 'zh' ? '；' : '; ');
  }
  const parts = MK.effects.map((e) => {
    const c = mkCondText(e);
    let s = '';
    if (e.when === 'card') s = '每张' + (c || '打出的') + '牌';
    else if (e.when === 'hand') s = '打出这一手' + (c ? '（' + c + '）' : '');
    else if (e.when === 'held') s = '留在手里的' + (c || '每张') + '牌';
    else if (e.when === 'repetition') s = (c || '打出的牌') + '再结算一次';
    else if (e.when === 'discard') s = '每次弃牌';
    else if (e.when === 'independent') s = '每张牌独立结算时';
    else if (e.when === 'sell') s = '这张牌被卖掉时';
    return s + ' ' + mkEffText(e);
  });
  return parts.join(lang === 'zh' ? '；' : '; ');
}
/** 生成完整的 mod Lua（含 Atlas 声明与对象声明） */
function mkItemLua () {
  const t = mkType();
  const L = [];
  const key = String(MK.key || 'thing').replace(/[^A-Za-z0-9_]/g, '_') || 'thing';
  const nameZh = MK.nameZh || key, nameEn = MK.nameEn || nameZh;
  const textZh = MK.textZh || mkAutoText('zh'), textEn = MK.textEn || mkAutoText('en');
  L.push('-- ' + MKR.modName + ' · 由图鉴「Mod 制作器」生成');
  L.push('-- 直接放：%AppData%/Balatro/Mods/' + MKR.modId + '/');
  L.push('');
  /* 图集：动图要写全三样（atlas_table / frames / fps），字段之间的逗号统一在这里拼，避免手写续行漏逗号 */
  const atlasLines = (key, file, anim) => {
    const rows = [['key', "'" + key + "'"], ['path', "'" + file + "'"], ['px', String(CARD_W)], ['py', String(CARD_H)]];
    if (anim && anim.n > 1) {
      rows.push(['atlas_table', "'ANIMATION_ATLAS'", '动图必须写这一行：不写就算静态图集，帧数会被忽略']);
      rows.push(['frames', String(anim.n), '动图：横向帧序列']);
      rows.push(['fps', String(anim.fps), '基准 ' + anim.baseMs + 'ms/帧']);
      /* 各帧快慢不一样时：帧停留 = 倍数 / fps（见 overrides.lua 的 frame_duration / fps） */
      if (anim.frame_durations) rows.push(['sprite_args', '{ frame_durations = { ' + anim.frame_durations.join(', ') + ' } }', '逐帧时长倍数（1 = 基准），缩放要这样写才和 fps 对得上']);
    }
    return rows.map((r, i) => '    ' + r[0] + ' = ' + r[1] + (i < rows.length - 1 ? ',' : '') + (r[2] ? '   -- ' + r[2] : ''));
  };
  const aAnim = mkAnimArgs(MK.art);
  const slug = mkSlug(MK);
  L.push('SMODS.Atlas {');
  for (const line of atlasLines('sheet_' + slug, 'sheet_' + slug + '.png', aAnim)) L.push(line);
  L.push('}');
  if (MK.type === 'Joker' && MK.soul.on) {
    L.push('');
    L.push('SMODS.Atlas {');
    const sAnim = mkAnimArgs(MK.soul);
    for (const line of atlasLines('soul_' + slug, 'soul_' + slug + '.png', sAnim)) L.push(line);
    L.push('}');
  }
  L.push('');
  const loc = [
    '    loc_txt = {',
    "        name = '" + nameZh.replace(/'/g, "\\'") + "',",
    '        text = {',
    "            '" + textZh.replace(/'/g, "\\'") + "'",
    '        }',
    '    },',
  ];
  if (MK.type === 'Joker') {
    const cfg = MK.effects.map((e) => {
      const v = Number(e.val) || 0;
      const k = e.eff === 'reps' ? 'repetitions' : e.eff;
      return '        ' + k + ' = ' + (e.eff === 'xmult' ? (v || 1) : v);
    });
    L.push('SMODS.Joker {');
    L.push("    key = '" + key + "',");
    L.push.apply(L, loc);
    L.push('    config = {');
    L.push('        extra = {');
    L.push.apply(L, cfg);
    L.push('        }');
    L.push('    },');
    L.push('    rarity = ' + MK.rarity + ',');
    L.push('    cost = ' + MK.cost + ',');
    L.push("    atlas = 'sheet_" + slug + "',");
    L.push('    pos = { x = ' + (MK.art.pos.x || 0) + ', y = ' + (MK.art.pos.y || 0) + ' },');
    L.push('    order = ' + MK.order + ',');
    L.push('    weight = ' + MK.weight + ',');
    L.push('    eternal_compat = ' + (MK.eternal ? 'true' : 'false') + ',');
    L.push('    perishable_compat = ' + (MK.perishable ? 'true' : 'false') + ',');
    L.push('    blueprint_compat = ' + (MK.blueprint ? 'true' : 'false') + ',');
    if (MK.soul.on) {
      /* 立绘是单独一张 soul.png，所以要写 soul_atlas：游戏就是按这个字段去找那层前景精灵的
         （overrides.lua: atlas_key = lc_soul_atlas or soul_atlas or lc_atlas or atlas or set）。
         只写 soul_pos 的话它会去**主体的图集**里找，等于把牌面自己飘一遍，立绘那张图用不上。 */
      L.push("    soul_atlas = 'soul_" + slug + "',");
    }
    L.push('    calculate_joker = function(self, context)');
    MK.effects.forEach((e, i) => {
      L.push('        -- ' + (i + 1) + '. ' + mkWhenText(e) + '：' + mkEffText(e));
      mkEffectLua(e).split('\n').forEach((ln) => L.push('        ' + ln));
    });
    L.push('        return nil');
    L.push('    end');
    L.push('}');
  } else if (MK.type === 'Consumable') {
    L.push('SMODS.Consumable {');
    L.push("    key = '" + key + "',");
    L.push("    set = '" + (MK.set || 'Tarot') + "',");
    L.push.apply(L, loc);
    L.push('    config = { extra = { value = ' + (Number(MK.useVal) || 0) + ' } },');
    L.push('    cost = ' + MK.cost + ',');
    L.push("    atlas = 'sheet_" + slug + "',");
    L.push('    pos = { x = ' + (MK.art.pos.x || 0) + ', y = ' + (MK.art.pos.y || 0) + ' },');
    L.push('    can_use = function(self, card) return true end,');
    L.push('    use = function(self, card, area, copier)');
    if (MK.useKind === 'dollars') L.push('        ease_dollars(' + (Number(MK.useVal) || 0) + ')');
    else if (MK.useKind === 'chips') L.push('        update_hand_text({ immediate = true }, { chips = G.GAME.chips + ' + (Number(MK.useVal) || 0) + ' })');
    else if (MK.useKind === 'mult') L.push('        update_hand_text({ immediate = true }, { mult = ' + (Number(MK.useVal) || 0) + ' })');
    else if (MK.useKind === 'handsize') L.push('        G.hand:change_size(' + (Number(MK.useVal) || 1) + ')');
    else if (MK.useKind === 'tarot' || MK.useKind === 'planet') L.push("        local c = create_card('" + (MK.useKind === 'tarot' ? 'Tarot' : 'Planet') + "', G.play); c:add_to_deck(); G.consumeables:emplace(c)");
    else L.push('        -- 想做点什么就改这里');
    L.push('    end');
    L.push('}');
  } else if (MK.type === 'Blind') {
    const t2 = MK.t;
    L.push('SMODS.Blind {');
    L.push("    key = '" + key + "',");
    L.push.apply(L, loc);
    L.push('    boss = { min = ' + (t2.boss_min || 1) + ', max = ' + (t2.boss_max || 10) + ' },');
    L.push('    mult = ' + (t2.blind_mult || 2) + ',');
    L.push('    dollars = ' + (t2.blind_dollars || 5) + ',');
    L.push('    atlas = \'sheet_' + slug + '\',');
    L.push('    pos = { x = ' + (MK.art.pos.x || 0) + ', y = ' + (MK.art.pos.y || 0) + ' },');
    const db = [];
    if (t2.debuff_suit) db.push("suit = '" + t2.debuff_suit + "'");
    if (t2.debuff_face) db.push("is_face = 'face'");
    L.push('    debuff = { ' + db.join(', ') + ' },   -- 声明式削弱：图鉴与本页都会按它算');
    L.push('    loc_debuff_text = { \'\' },');
    L.push('    unlocked = true,');
    L.push('    discovered = true');
    L.push('}');
  } else if (MK.type === 'Booster') {
    const t2 = MK.t;
    L.push('SMODS.Booster {');
    L.push("    key = '" + key + "',");
    L.push.apply(L, loc);
    L.push("    kind = '" + (t2.kind || 'Arcana') + "',");
    L.push('    config = { choose = ' + (t2.choose || 1) + ', extra = ' + (t2.extra || 3) + ' },');
    L.push('    cost = ' + (t2.cost || 4) + ',');
    L.push("    atlas = 'sheet_" + slug + "',");
    L.push('    pos = { x = ' + (MK.art.pos.x || 0) + ', y = ' + (MK.art.pos.y || 0) + ' },');
    L.push('    unlocked = true,');
    L.push('    discovered = true');
    L.push('}');
  } else if (MK.type === 'Back') {
    const t2 = MK.t;
    L.push('SMODS.Back {');
    L.push("    key = '" + key + "',");
    L.push.apply(L, loc);
    L.push('    config = {');
    L.push('        hand_size = ' + (t2.hand_size || 8) + ',');
    L.push('        hands = ' + (t2.hands || 4) + ',');
    L.push('        discards = ' + (t2.discards || 3) + ',');
    L.push('        dollars = ' + (t2.dollars || 4) + ',');
    L.push('        joker_slot = ' + (t2.joker_slot || 5) + ',');
    L.push('        consumable_slot = ' + (t2.consumable_slot || 2));
    L.push('    },');
    L.push("    atlas = 'sheet_" + slug + "',");
    L.push('    pos = { x = ' + (MK.art.pos.x || 0) + ', y = ' + (MK.art.pos.y || 0) + ' },');
    L.push('    unlocked = true,');
    L.push('    discovered = true');
    L.push('}');
  } else if (MK.type === 'Tag') {
    const t2 = MK.t;
    L.push('SMODS.Tag {');
    L.push("    key = '" + key + "',");
    L.push.apply(L, loc);
    L.push("    atlas = 'sheet_" + slug + "',");
    L.push('    pos = { x = ' + (MK.art.pos.x || 0) + ', y = ' + (MK.art.pos.y || 0) + ' },');
    L.push('    config = { ' + (t2.tag_kind || 'dollars') + ' = ' + (t2.tag_val || 5) + ' },');
    L.push('    apply = function(self, tag, context)');
    L.push('        if context.type == \'immediate\' then');
    if ((t2.tag_kind || 'dollars') === 'dollars') L.push('            ease_dollars(' + (t2.tag_val || 5) + ')');
    else if ((t2.tag_kind || '') === 'tarot' || (t2.tag_kind || '') === 'planet') L.push("            local c = create_card('" + (t2.tag_kind === 'tarot' ? 'Tarot' : 'Planet') + "', G.play); c:add_to_deck(); G.consumeables:emplace(c)");
    else L.push('            G.GAME.round_resets.free_rerolls = (G.GAME.round_resets.free_rerolls or 0) + ' + (t2.tag_val || 1));
    L.push('            tag:yep(\'+\', G.C.GOLD)');
    L.push('            return true');
    L.push('        end');
    L.push('    end');
    L.push('}');
  } else if (MK.type === 'Enhanced' || MK.type === 'Edition') {
    const t2 = MK.t;
    L.push('SMODS.' + (MK.type === 'Enhanced' ? 'Enhancement' : 'Edition') + ' {');
    L.push("    key = '" + key + "',");
    L.push.apply(L, loc);
    L.push('    config = { ' + ['chips', 'mult', 'xmult'].filter((k) => Number(t2[k])).map((k) => (k === 'xmult' ? 'x_mult' : k) + ' = ' + t2[k]).join(', ') + ' },');
    L.push("    atlas = 'sheet_" + slug + "',");
    L.push('    pos = { x = ' + (MK.art.pos.x || 0) + ', y = ' + (MK.art.pos.y || 0) + ' },');
    L.push('    unlocked = true,');
    L.push('    discovered = true');
    L.push('}');
  } else if (MK.type === 'Seal') {
    L.push('-- 蜡封本身没有数值字段：它的效果写在卡牌被它影响时的逻辑里');
    L.push('SMODS.Seal {');
    L.push("    key = '" + key + "',");
    L.push.apply(L, loc);
    L.push("    atlas = 'sheet_" + slug + "',");
    L.push('    pos = { x = ' + (MK.art.pos.x || 0) + ', y = ' + (MK.art.pos.y || 0) + ' },');
    L.push('}');
  } else {
    const cls = t[2];
    L.push('SMODS.' + cls + ' {');
    L.push("    key = '" + key + "',");
    L.push.apply(L, loc);
    if (MK.type === 'Voucher') {
      L.push('    cost = ' + MK.cost + ',');
      const t2 = MK.t;
      L.push('    redeem = function(self, card)');
      if ((t2.voucher_kind || 'none') === 'dollars') L.push('        ease_dollars(' + (t2.voucher_val || 10) + ')');
      else if ((t2.voucher_kind || '') === 'handsize') L.push('        G.hand:change_size(1)');
      else if ((t2.voucher_kind || '') === 'discards') L.push('        G.GAME.round_resets.discards = G.GAME.round_resets.discards + 1');
      else if ((t2.voucher_kind || '') === 'slot') L.push('        G.jokers.config.card_limit = (G.jokers.config.card_limit or 5) + 1');
      else L.push('        -- 想做点什么就改这里');
      L.push('    end,');
    }
    L.push("    atlas = 'sheet_" + slug + "',");
    L.push('    pos = { x = ' + (MK.art.pos.x || 0) + ', y = ' + (MK.art.pos.y || 0) + ' },');
    if (MK.type === 'Booster') L.push('    config = { extra = 3, choose = 1 },');
    if (MK.type === 'Blind') L.push('    boss = { min = 1, max = 10 },');
    L.push('    unlocked = true,');
    L.push('    discovered = true');
    L.push('}');
  }
  return L.join('\n') + '\n';
}
function mkManifest () {
  return JSON.stringify({
    id: MKR.modId,
    name: MKR.modName,
    /* 注意：Steamodded 的 manifest 校验里 author 必须是**字符串数组**（loader.lua: type = 'table'），
       写成一个字符串会被判为不合法、整包加载失败。 */
    author: [MKR.author || 'unknown'],
    priority: 0,
    version: MKR.version,
    description: MK.desc,
    prefix: MKR.prefix,
    main_file: MKR.modId + '.lua',
    dependencies: ['Steamodded (>=1.0.0~BETA-0706b)', 'Lovely (>=0.6)'],
    provides: ['图鉴 Mod 制作器'],
  }, null, 2) + '\n';
}
/** 生成整个 mod 的文件表（名字 → 字节），给 zipStore / 自检用 */
async function mkBuildFiles () {
  mkNormalizeKeys();   /* 打包前先保证 key 不重名 */
  const files = [];
  files.push({ name: 'manifest.json', data: TE.encode(mkManifest()) });
  files.push({ name: MKR.modId + '.lua', data: TE.encode(mkLua()) });
  /* 逐条目打包：每条自己的帧条文件（sheet_<slug>.png / soul_<slug>.png），和 Lua 里的图集 key 一一对应。
     生成时把 MK 临时切到那一条上 —— 贴图/帧序列/动效/逐帧时长这些逻辑一行都不用改。 */
  const keepMK = MK;
  for (const it of MKR.items) {
    MK = it;
    const slug = mkSlug(it);
    /* 尺寸自检：动图是横向帧条，宽度必须正好是 帧数×格宽 —— 算错的话后面 toBlob 会直接挂住 */
    const artList0 = mkSourceFrames(MK.art);
    const nArt = artList0 ? artList0.length : 1;
    const s1 = mkSheetCanvas(1, 'art'); const s2 = mkSheetCanvas(2, 'art');
    if (s1.width !== CARD_W * nArt || s2.width !== CARD_W * 2 * nArt) {
      throw new Error('第 ' + (MKR.items.indexOf(it) + 1) + ' 条（' + (it.nameZh || it.key) + '）帧条宽度不对：1x ' + s1.width + '、2x ' + s2.width + '，按 ' + nArt + ' 帧应该是 ' + (CARD_W * nArt) + ' 和 ' + (CARD_W * 2 * nArt));
    }
    files.push({ name: 'assets/1x/sheet_' + slug + '.png', data: await canvasBytes(s1) });
    files.push({ name: 'assets/2x/sheet_' + slug + '.png', data: await canvasBytes(s2) });
    if (MK.type === 'Joker' && MK.soul.on) {
      const soulList0 = mkSourceFrames(MK.soul);
      const nSoul = soulList0 ? soulList0.length : 1;
      const q1 = mkSheetCanvas(1, 'soul'); const q2 = mkSheetCanvas(2, 'soul');
      if (q1.width !== CARD_W * nSoul || q2.width !== CARD_W * 2 * nSoul) {
        throw new Error('第 ' + (MKR.items.indexOf(it) + 1) + ' 条立绘帧条宽度不对：1x ' + q1.width + '、2x ' + q2.width + '，按 ' + nSoul + ' 帧应该是 ' + (CARD_W * nSoul) + ' 和 ' + (CARD_W * 2 * nSoul));
      }
      files.push({ name: 'assets/1x/soul_' + slug + '.png', data: await canvasBytes(q1) });
      files.push({ name: 'assets/2x/soul_' + slug + '.png', data: await canvasBytes(q2) });
    }
  }
  MK = keepMK;
  return files;
}
/** 只刷新 Lua 文本框与预览那行（文本框里打字时用） */
function mkRefreshLuaAndPreview () {
  const lua = document.querySelector('#mkLua');
  if (lua && !MK.luaDirty) lua.value = mkLua();
  const line = document.querySelector('.mkpvline');
  if (line) line.innerHTML = '<b>' + esc(MK.nameZh || MK.key) + '</b> · ' + esc(mkType()[1]) +
    '<br>' + esc(mkShownText() || '（还没有效果）');
}
/** 换类型时：名字 / key 若还是"上一个类型的默认值"，就一起换成新类型的默认值 */
function mkApplyTypeDefaults (prevType) {
  const prev = MK_DEFAULT_NAME[prevType] || null;
  const next = MK_DEFAULT_NAME[MK.type] || null;
  if (!next) return;
  if (!MK.nameZh || (prev && MK.nameZh === prev[0])) MK.nameZh = next[0];
  if (!MK.key || (prev && MK.key === prev[1])) MK.key = next[1];
  if (!MK.nameEn || (prev && MK.nameEn === prev[0])) MK.nameEn = next[0];
}
function mkSet (patch) {
  const prevType = MK.type;
  Object.assign(MK, patch);
  if (patch && patch.type && patch.type !== prevType) mkApplyTypeDefaults(prevType); if (patch && ('type' in patch || 'key' in patch || 'art' in patch || 'effects' in patch)) MK.luaDirty = false; mkSaveProject(); mkRedraw() }
let mkRedraw = () => { render() };

/* ---------------------------------------------------------------- 视图 */
/* Mod 制作器视图（重写版）：一个函数、一层作用域、按顺序建。
   之前两次失败都出在"跨块共享变量/跨块塞 DOM"，这一版原则上不那样做：
   所有元素引用都是本函数的 const，谁的块里用就在谁的块里建。
   结构：顶栏 → 左栏（预览 + 导出）→ 右栏五段：
     ① 做什么（类型胶囊 + 来源与贴图：照现成的牌 / 取图集格子 / 上传自己的图 / 悬浮立绘）
     ② 它做什么（预设库 + 句子式效果行 + 游戏内描述预览）
     ③ 名字与描述   ④ 数值与兼容性   ⑤ 高级 */
let mkProjectLoaded = false;
let mkNeedBoxEl = null; let mkSectionParent = null;
let mkApplyCloneImpl = null;   /* viewMaker 内部的「照某张牌做」函数挂在这里，供模块级暴露给测试调用 */
function viewMaker (root) {
  /* 第一次打开：保证至少有一条，并把上次自动保存的工程读回来 */
  if (!mkProjectLoaded) { mkProjectLoaded = true; mkEnsureItems(); try { mkLoadProject() } catch (e) { /* 读不回来就用默认的 */ } }
  const MKEL = {};
  let artTarget = 'art';        /* 网格在给谁选格子：art / soul */

  /* ---------- 顶栏 ---------- */
  const head = document.createElement('div'); head.className = 'mkhead';
  const hchips = MK_TYPES.map((t) => '<button class="mkhchip' + (t[0] === MK.type ? ' on' : '') + '" data-mktype="' + t[0] + '">' + t[1] + '</button>').join('');
  head.innerHTML = '<div class="mkhtitle"><b>Mod 制作器</b><span>不用写代码，选一选就能出一个能用的 mod</span></div>' +
    '<div class="mkhchips">' + hchips + '</div>' +
    '<div class="mkhsum" id="mkSum">' + mkSummaryHtml() + '</div>';
  head.onclick = (e) => { const b = e.target.closest('[data-mktype]'); if (b) mkSet({ type: b.dataset.mktype }) };
  root.appendChild(head);

  const wrap = document.createElement('div'); wrap.className = 'maker';
  const left = document.createElement('div'); left.className = 'mkleft';
  const right = document.createElement('div'); right.className = 'mkright';
  wrap.appendChild(left); wrap.appendChild(right); root.appendChild(wrap);

  /* ---------- 左栏：预览 + 导出 ---------- */
  const pv = document.createElement('div'); pv.className = 'mkpv';
  const pvBox = document.createElement('div'); pvBox.className = 'mkpvbox';
  MKEL.pvBox = pvBox;
  const repo = (cv, px) => {
    if (!cv) return;
    cv.style.width = px + 'px';
    cv.style.height = Math.round(px * CARD_H / CARD_W) + 'px';
    pvBox.appendChild(cv);
  };
  repo(mkPreviewCanvas(), 142);
  pv.appendChild(pvBox);
  const pvLine = document.createElement('div'); pvLine.className = 'mkpvline';
  pvLine.innerHTML = '<div class="mkpvname"><b>' + esc(MK.nameZh || MK.key) + '</b>' + mkTag() + '</div>' +
    '<div class="mkpvfx">' + esc(mkShownText() || mkPlaceholderText()) + '</div>';
  pv.appendChild(pvLine);
  left.appendChild(pv);

  const io = document.createElement('div'); io.className = 'mkio opt';
  io.innerHTML = '<h4><span class="otitle">导出</span></h4><div class="obody">' +
    '<div class="mkrow"><label>mod id<input class="tbtn" data-mk="modId"></label>' +
    '<label>前缀<input class="tbtn" data-mk="prefix" title="Steamodded 会自动给 key 加这个前缀"></label></div>' +
    '<div class="mkrow"><label>作者<input class="tbtn" data-mk="author"></label>' +
    '<label>版本<input class="tbtn" data-mk="version"></label></div>' +
    '<div class="mkbtnrow"><button class="btn primary" id="mkZip">⬇ 下载 mod zip</button>' +
    '<button class="btn" id="mkCheck">✓ 自检并导入</button>' +
    '<button class="btn" id="mkCopy">📋 复制 Lua</button></div>' +
    '<div class="hint" id="mkStatus">生成的是能直接丢进 <code>Mods/</code> 的 mod：manifest + Lua + 1x/2x 贴图。</div></div>';
  left.appendChild(io);

  /* ---------- 段工具 ---------- */
  const section = (title) => {
    const box = document.createElement('section'); box.className = 'opt';
    const h = document.createElement('h4');
    h.innerHTML = '<span class="otitle">' + title + '</span><span class="chev">▾</span>';
    const body = document.createElement('div'); body.className = 'obody';
    h.onclick = () => box.classList.toggle('collapsed');
    box.appendChild(h); box.appendChild(body);
    right.appendChild(box);
    return body;
  };
  const field = (label, inner, cls) => {
    const lab = document.createElement('label');
    if (cls) lab.className = cls;
    lab.innerHTML = '<span>' + label + '</span>';
    if (typeof inner === 'string') lab.insertAdjacentHTML('beforeend', inner);
    else lab.appendChild(inner);
    return lab;
  };

  /* ---------- ⓪ 这个 mod 里有什么（工程：多条目、分组、自动保存、JSON 备份） ---------- */
  {
    const body = section('⓪ 这个 mod 里有什么（一个工程，多个条目，最后打成一个 mod）');
    const pbtn = (label, fn, id) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; if (id) b.id = id; b.textContent = label; b.onclick = fn; return b };
    /* 工程级字段：装到 Mods/ 里的 id、游戏里显示的名字、作者、版本、条目 key 前缀 */
    const prow = document.createElement('div'); prow.className = 'mkrow';
    prow.appendChild(field('Mod id（Mods/ 下的文件夹名）', '<input class="tbtn" data-mkp="modId" value="' + esc(MKR.modId) + '">'));
    prow.appendChild(field('Mod 名称', '<input class="tbtn mkwide" data-mkp="modName" value="' + esc(MKR.modName) + '">'));
    prow.appendChild(field('作者', '<input class="tbtn mkn" data-mkp="author" value="' + esc(MKR.author) + '">'));
    prow.appendChild(field('版本', '<input class="tbtn mkn" data-mkp="version" value="' + esc(MKR.version) + '">'));
    prow.appendChild(field('条目 key 前缀', '<input class="tbtn mkn" data-mkp="prefix" value="' + esc(MKR.prefix) + '">'));
    body.appendChild(prow);
    body.appendChild(field('Mod 说明', '<input class="tbtn mkwide" data-mkp="desc" value="' + esc(MKR.desc) + '">'));
    /* 条目列表：按类型分组，点谁就编辑谁 */
    const list = document.createElement('div'); list.className = 'mkitems'; list.id = 'mkItems';
    mkGrouped().forEach((g) => {
      const head = document.createElement('div'); head.className = 'mkigrp';
      head.textContent = g.name + '（' + g.rows.length + '）';
      list.appendChild(head);
      g.rows.forEach((row) => {
        const el = document.createElement('div');
        el.className = 'mki' + (row.i === MKR.cur ? ' on' : '');
        el.title = '点它就开始编辑这一条';
        el.innerHTML = '<span class="mkin">' + (row.i + 1) + '</span><span class="mkiname">' + esc(row.it.nameZh || row.it.key) + '</span><code>' + esc(row.it.key) + '</code>';
        el.onclick = () => { mkSelect(row.i); status('现在在编辑第 ' + (row.i + 1) + ' 条：' + (row.it.nameZh || row.it.key)); redraw() };
        list.appendChild(el);
      });
    });
    body.appendChild(list);
    const brow = document.createElement('div'); brow.className = 'mkrow';
    brow.appendChild(pbtn('＋ 再加一个条目（' + mkType()[1] + '）', () => { mkAddItem(MK.type); status('已加一个新条目，现在编辑的就是它。'); redraw() }, 'mkAddItem'));
    brow.appendChild(pbtn('⧉ 复制这一个', () => { mkDupItem(); status('已复制成新条目：贴图 / 帧序列 / 立绘都带过来了，key 自动换了不重名的。'); redraw() }, 'mkDupItem'));
    brow.appendChild(pbtn('🗑 删除这一个', () => { if (mkDelItem()) { status('已删除这一条。'); redraw() } else status('只剩一个条目了，不能删。') }, 'mkDelItem'));
    brow.appendChild(pbtn('↑ 上移', () => { if (mkMoveItem(-1)) redraw() }, 'mkUp'));
    brow.appendChild(pbtn('↓ 下移', () => { if (mkMoveItem(1)) redraw() }, 'mkDown'));
    body.appendChild(brow);
    /* 概览 */
    const ov = document.createElement('div'); ov.className = 'hint'; ov.id = 'mkProjOverview';
    ov.textContent = '工程概览：' + MKR.items.length + ' 个条目 —— ' + mkGrouped().map((g) => g.name + ' ' + g.rows.length).join('、') +
      '；导出时打成一个 mod：一个 manifest.json + 一个 ' + MKR.modId + '.lua（注册全部条目）+ 每个条目自己的图集 sheet_<key>.png。改动会自动存在这台浏览器里。';
    body.appendChild(ov);
    /* JSON 备份 / 恢复 */
    const jrow = document.createElement('div'); jrow.className = 'mkrow';
    jrow.appendChild(pbtn('💾 导出工程 JSON（连图片，可备份 / 换机器）', () => {
      try {
        const o = mkProjectJSON(true);
        save(TE.encode(JSON.stringify(o)), MKR.modId + '.project.json', 'application/json');
        status('已导出工程 JSON（' + MKR.items.length + ' 个条目，连图片一起）。下次用「导入工程 JSON」就能接着改。', 'ok');
      } catch (e) { status('导出工程失败：' + e.message) }
    }, 'mkExpJson'));
    jrow.appendChild(pbtn('📂 导入工程 JSON', () => {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
      inp.onchange = async () => {
        const f = inp.files && inp.files[0]; if (!f) return;
        try {
          const o = JSON.parse(await f.text());
          if (!mkApplyProject(o)) { status('这个 JSON 里没有条目，导不进来。'); return }
          await mkRestoreImages(o);
          mkSaveProject(); redraw();
          status('已导入工程：' + MKR.items.length + ' 个条目（图片也一起恢复了）。', 'ok');
        } catch (e) { status('导入失败：' + e.message) }
      };
      inp.click();
    }, 'mkImpJson'));
    body.appendChild(jrow);
    /* 用之前必须知道的：加载器是前置条件，页面自己没法替你装（网页读不到你的硬盘） */
    const need = document.createElement('div'); need.className = 'mkneed'; need.id = 'mkNeedLoader';
    need.innerHTML = '<b>⚠ 想让它真的进游戏，需要先装两样东西（本页只负责生成 mod，装加载器得你自己动手）</b>' +
      '<ol>' +
      '<li><b>Lovely Injector</b>（注入器）——把它的 <code>version.dll</code> 放进游戏根目录（和 <code>Balatro.exe</code> 同一个文件夹）。你机器上装的是 <b>Lovely 0.9.0</b>，位置在 <code>' + esc(GAME_DIR_HINT) + '</code>。</li>' +
      '<li><b>Steamodded</b>（mod 框架，本页生成的 Lua 全靠它的 <code>SMODS.*</code> 接口）——解压后把整个 <code>smods</code> 文件夹放进 mod 目录。官网/下载：<a href="https://github.com/Steamodded/smods" target="_blank" rel="noopener">github.com/Steamodded/smods</a>，说明与教程：<a href="https://github.com/Steamopollys/Steamodded/wiki" target="_blank" rel="noopener">Steamodded Wiki</a>，遇到问题问人：<a href="https://discord.gg/kU8cqCqwy3" target="_blank" rel="noopener">Discord</a>。</li>' +
      '<li>mod 目录（Lovely 就看这里）：<code>%AppData%\\Balatro\\Mods</code>，本机就是 <code>' + esc(MODS_DIR_HINT) + '</code>。</li>' +
      '</ol>' +
      '<b>装 mod 的正确步骤</b>：点上面的「下载 mod zip」→ <b>解压</b> → 把解压出来的<b>文件夹</b>整个放进 mod 目录 → <b>重启游戏</b>。' +
      '<br><b>别把 zip 直接丢进去</b>：Steamodded 只认文件夹。放进 zip 游戏里会毫无反应，日志里只有一句 <code>No mod root found in zip</code>。' +
      '<br><b>出问题先看日志</b>：<code>%AppData%\\Balatro\\Mods\\lovely\\log\\</code> 里最新的那个 <code>.log</code>。' +
      '常见两条：<code>No mod root found in zip</code> = 你把 zip 放进去没解压；<code>Valid JSON file found</code> = 框架认了这个 mod（正常）。' +
      '<br><b>改完 mod 要重启游戏</b>才会重新加载。' +
      '<br><span class="mkneedtip">说明：原版 Balatro 没有官方 mod 接口，不装这两样东西，生成出来的 mod 是加载不了的（Lua 里的 SMODS 表根本不存在）。</span>';
    mkNeedBoxEl = need; mkSectionParent = body.parentElement;   /* 放到最底部，别占主要功能的位置（用户要求） */
  }
  /* ---------- ① 做什么（含：来源与贴图，全在这一段里） ---------- */
  {
    const body = section('① 做什么（也决定预览长什么样）');
    const chips = document.createElement('div'); chips.className = 'chips';
    MK_TYPES.forEach((t) => {
      const b = document.createElement('button');
      b.className = 'pick' + (t[0] === MK.type ? ' on' : '');
      b.textContent = t[1];
      b.onclick = () => mkSet({ type: t[0] });
      chips.appendChild(b);
    });
    body.appendChild(chips);

    const src = document.createElement('div'); src.className = 'mksrc';
    src.innerHTML = '<div class="mklabel">来源与贴图 —— 看下图点一格就是「照这张牌做」（图 + 名字 + 效果 + 数值一起进来）；只想换图按住 Shift 点；也可以按名字在下拉里找，或上传自己的图</div>';
    /* 1) 照现成的牌做（原版 + mod） */
    const clone = document.createElement('label'); clone.className = 'mkwide';
    const pickable = ['Joker', 'Consumable', 'Voucher', 'Booster', 'Deck', 'Enhancement', 'Edition', 'Seal', 'Tag', 'Blind'];
    const allItems = ITEMS.filter((i) => pickable.indexOf(i.cat) >= 0);
    const vanilla = allItems.filter((i) => !i.source);
    const modGroups = {};
    allItems.filter((i) => i.source).forEach((i) => { (modGroups[i.source] = modGroups[i.source] || []).push(i) });
    clone.innerHTML = '<span>按名字找现成的牌（原版 + 已导入的 mod 全都在这里）—— 也可以直接在下面的图格子上点</span>' +
      '<select class="tbtn" id="mkClone"><option value="">（不复制，自己从头做）</option>' +
      '<optgroup label="原版 Balatro（' + vanilla.length + '）">' + vanilla.map((i) => '<option value="' + i.id + '">' + esc(i.cat + ' · ' + nm(i)) + '</option>').join('') + '</optgroup>' +
      Object.keys(modGroups).map((k) => '<optgroup label="' + esc(modGroups[k][0].sourceName || k) + '（' + modGroups[k].length + '）">' +
        modGroups[k].map((i) => '<option value="' + i.id + '">' + esc(i.cat + ' · ' + nm(i)) + '</option>').join('') + '</optgroup>').join('') +
      '</select>';
    src.appendChild(clone);
    /* 2) 从图集里取一格 + 上传自己的图 */
    const atlasNames = Object.keys(D.atlases);
    const row = document.createElement('div'); row.className = 'mkrow';
    row.appendChild(field('② 从哪个图集取图', '<select class="tbtn" id="mkAtlas">' +
      atlasNames.map((x) => '<option value="' + x + '"' + (MK.art.atlas === x ? ' selected' : '') + '>' + mkAtlasLabel(x) + '</option>').join('') + '</select>'));
    row.appendChild(field('③ 或上传自己的图（可多选，每张图当一帧）', '<input type="file" id="mkUpload" accept="image/*" multiple>', 'mkfile'));
    src.appendChild(row);
    /* 动效：不用导入动图也能动 —— 按预设把一张静图现场渲染成帧序列（游戏里的做法就是横向 N 帧 + fps） */
    const gen = MK.art.gen || { kind: '', n: 8, fps: 10, amp: 3 };
    const genRow = document.createElement('div'); genRow.className = 'mkrow';
    genRow.appendChild(field('④ 让它动起来（不导入动图也行，按预设现场生成帧）',
      '<select class="tbtn" id="mkMotion">' + MK_MOTION.map((m) => '<option value="' + m[0] + '"' + (gen.kind === m[0] ? ' selected' : '') + '>' + m[1] + '</option>').join('') + '</select>'));
    genRow.appendChild(field('帧数', '<select class="tbtn" id="mkMotionN">' + [4, 6, 8, 10, 12, 16, 20].map((k) => '<option value="' + k + '"' + (gen.n === k ? ' selected' : '') + '>' + k + ' 帧</option>').join('') + '</select>'));
    genRow.appendChild(field('帧率（原版默认 10）', '<select class="tbtn" id="mkMotionFps">' + [4, 6, 8, 10, 12, 15, 20, 25].map((k) => '<option value="' + k + '"' + (gen.fps === k ? ' selected' : '') + '>' + k + ' fps</option>').join('') + '</select>'));
    genRow.appendChild(field('幅度', '<input type="range" id="mkMotionAmp" min="1" max="8" value="' + gen.amp + '">'));
    const spd = MK.art.speed || 1;
    genRow.appendChild(field('播放速度（越大越慢；导入的动图默认 2×）', '<select class="tbtn" id="mkSpeed">' + [[0.5, '0.5×（更快）'], [1, '1×（按动图本身的时长）'], [1.5, '1.5×'], [2, '2×（默认）'], [3, '3×'], [4, '4×（很慢）']].map((k) => '<option value="' + k[0] + '"' + (spd === k[0] ? ' selected' : '') + '>' + k[1] + '</option>').join('') + '</select>'));
    src.appendChild(genRow);
    /* 逐帧时长：导入的动图如果各帧快慢不一样，这里能一眼看出哪几帧更慢，也能自己调 */
    const frNow = mkSourceFrames(MK.art);
    if (frNow && frNow.length > 1 && frNow.length <= 24) {
      const wRow = document.createElement('div'); wRow.className = 'mkweights';
      const wNow = MK.art.weights || [];
      wRow.innerHTML = '<span class="mklabel">每帧时长（倍数，1 = 一个基准时长）</span>' + frNow.map((_x, i) =>
        '<label class="mkweight"><span>' + (i + 1) + '</span><input type="number" min="1" max="99" data-frame="' + i + '" value="' + (wNow[i] || 1) + '"></label>').join('') +
        '<div class="hint" id="mkWeightHint">' + mkWeightHintText() + '</div>';
      src.appendChild(wRow);
    }
    src.insertAdjacentHTML('beforeend', '<div class="hint" id="mkCloneHint"></div><div class="hint">' + MK_IMG_TIP + '</div><div class="hint" id="mkMotionHint">' + mkMotionHintText() + '</div><div class="hint" id="mkArtHint"></div>');
    const grid = document.createElement('div'); grid.className = 'mkartgrid'; grid.id = 'mkArtGrid';
    src.appendChild(grid);
    /* 3) 悬浮立绘：自己的图集 / 自己的文件 */
    if (MK.type === 'Joker') {
      const soul = document.createElement('div'); soul.className = 'mksoul';
      const row2 = document.createElement('div'); row2.className = 'mkrow';
      row2.appendChild(field('立绘从哪个图集取', '<select class="tbtn" id="mkSoulAtlas">' +
        atlasNames.map((x) => '<option value="' + x + '"' + (MK.soul.atlas === x ? ' selected' : '') + '>' + mkAtlasLabel(x) + '</option>').join('') + '</select>'));
      row2.appendChild(field('或上传立绘文件（可多选，每张图当一帧）', '<input type="file" id="mkSoulUp" accept="image/*" multiple>', 'mkfile'));
      const pickBtn = document.createElement('button');
      pickBtn.className = 'btn'; pickBtn.type = 'button'; pickBtn.id = 'mkSoulPick';
      pickBtn.textContent = '在下面的网格里选立绘的格子';
      row2.appendChild(pickBtn);
      const sgen = MK.soul.gen || { kind: '', n: 8, fps: 10, amp: 3 };
      row2.appendChild(field('立绘动效', '<select class="tbtn" id="mkSoulMotion">' + MK_MOTION.map((m) => '<option value="' + m[0] + '"' + (sgen.kind === m[0] ? ' selected' : '') + '>' + m[1] + '</option>').join('') + '</select>'));
      soul.innerHTML = '<label class="mkck"><input type="checkbox" id="mkSoulOn"' + (MK.soul.on ? ' checked' : '') + '>给这张牌加一层「悬浮立绘」（传奇牌那种飘在半空的画）</label>';
      soul.appendChild(row2);
      soul.insertAdjacentHTML('beforeend', '<div class="hint" id="mkSoulHint">' + (MK.soul.uploadName ? ('立绘用的是你上传的文件：' + esc(MK.soul.uploadName)) : ('立绘取 ' + esc(MK.soul.atlas) + ' 的 x' + MK.soul.pos.x + ' y' + MK.soul.pos.y)) + '；开启后预览里会立刻叠出来（有帧序列时会飘着动）。</div>');
      src.appendChild(soul);
    }
    body.appendChild(src);

  /** 图集格子 → 对应的牌（同一个图集同一格的那张）。原版和导入的 mod 都算。 */
function mkItemAtCell (atlas, x, y) {
  if (typeof ITEMS === 'undefined') return null;
  let best = null;
  for (const it of ITEMS) {
    const sp = it.sprite || it;
    if (!sp || !sp.atlas || sp.atlas !== atlas) continue;
    const ps = sp.pos || it.pos;
    if (!ps || ps.x !== x || ps.y !== y) continue;
    if (it.cat === MK.type) return it;          /* 优先同类型的那张 */
    if (!best) best = it;
  }
  return best;
}
  /* 网格：滚到才画；点格子给 art 或 soul —— 有对应牌时直接「照这张牌做」 */
    const paintCell = (cell, x, y) => {
      if (cell.__painted) return;
      cell.__painted = true;
      const a = D.atlases[MK.art.atlas];
      if (!a) return;
      const sc = a.scale || 1;
      const cv = newCanvas(34, 46);
      const c2 = cv.getContext('2d');
      c2.imageSmoothingEnabled = false;
      const sw = a.px * sc, sh = a.py * sc;
      const r = Math.min(cv.width / sw, cv.height / sh);
      try { c2.drawImage(IMG[a.file], x * sw, y * sh, sw, sh, (cv.width - sw * r) / 2, (cv.height - sh * r) / 2, sw * r, sh * r) } catch (e) { /* 图没解码完 */ }
      cell.appendChild(cv);
    };
    const a = D.atlases[MK.art.atlas];
    if (a) {
      const sc = a.scale || 1;
      const cols = a.cols || Math.max(1, Math.floor(a.w / (a.px * sc)));
      const rows = a.rows || Math.max(1, Math.floor(a.h / (a.py * sc)));
      const total = Math.min(cols * rows, 240);
      for (let i = 0; i < total; i++) {
        const x = i % cols, y = Math.floor(i / cols);
        const cell = document.createElement('button');
        const cur = artTarget === 'soul' ? MK.soul : MK.art;
        cell.className = 'mkcell' + (!cur.upload && cur.pos.x === x && cur.pos.y === y ? ' on' : '');
        const mate = artTarget === 'soul' ? null : mkItemAtCell(MK.art.atlas, x, y);
        cell.title = 'x=' + x + ' y=' + y + (artTarget === 'soul' ? '（给立绘）' : '') + (mate ? ('\n这张图是「' + nm(mate, 'zh_CN') + '」—— 点它 = 照这张牌做（图 + 名字 + 效果 + 数值）\n按住 Shift 点 = 只换图') : '');
        if (mate) cell.className += ' hasitem';
        cell.onclick = (e) => {
          if (artTarget === 'soul') { mkSet({ soul: Object.assign({}, MK.soul, { atlas: MK.art.atlas, pos: { x, y }, upload: null, uploadName: '', frames: null }) }); return }
          if (mate && !e.shiftKey) {
            const rr2 = mkApplyCloneFrom(mate.id);
            status('已照「' + nm(mate, 'zh_CN') + '」做了一份：图、名字、原文、数值都进来了（' + rr2.effects + ' 条效果 / ' + rr2.tKeys + ' 项专属设置）' + (rr2.effects ? '' : '，这张牌的效果没法自动拆成数值，请在「它做什么」里挑一条') + ' —— 想只换图就按住 Shift 点同一格。', 'ok');
            return;
          }
          mkSet({ art: { atlas: MK.art.atlas, pos: { x, y }, upload: null, uploadName: '', frames: null, animated: false, weights: null, gen: null, delays: null, speed: 1 } });
          if (mate) status('只换了贴图（这张图对应的「' + nm(mate, 'zh_CN') + '」的设置没动）—— 想连设置一起要，直接点这格（别按 Shift）。');
        };
        grid.appendChild(cell);
        if (IO) { cell._paint = () => paintCell(cell, x, y); IO.observe(cell) } else paintCell(cell, x, y);
      }
    }
    const hint = src.querySelector('#mkArtHint');
    if (hint) hint.textContent = MK.art.uploadName ? ('主体用的是你上传的图：' + MK.art.uploadName + (MK.art.frames ? '（动图 ' + MK.art.frames.length + ' 帧）' : '')) : (a ? (a.file + ' · ' + (a.cols || '?') + '×' + (a.rows || '?') + ' 格 · 当前 x=' + MK.art.pos.x + ' y=' + MK.art.pos.y + (artTarget === 'soul' ? '（网格现在给立绘选）' : '')) : '这个图集没有贴图信息');

    /* 类型专属设置（盲注/补充包/牌组/标签/优惠券/强化/版本/蜡封） */
    if (MK_TYPE_FIELDS[MK.type]) {
      const tf = document.createElement('div'); tf.className = 'mktfields';
      tf.innerHTML = '<div class="mklabel">这个类型专属的设置</div>';
      const rowT = document.createElement('div'); rowT.className = 'mkrow';
      MK_TYPE_FIELDS[MK.type].forEach((f) => {
        const key = f[0], label = f[1], kind = f[2], opt = f[3];
        const cur = MK.t[key] !== undefined ? MK.t[key] : opt;
        if (kind === 'num') {
          rowT.appendChild(field(label, '<input class="tbtn mkn" type="number" step="0.5" data-mkt="' + key + '" value="' + cur + '">'));
        } else if (kind === 'bool') {
          rowT.appendChild(field(label, '<input type="checkbox" data-mkt="' + key + '"' + (cur ? ' checked' : '') + '>', 'mkck'));
        } else if (kind === 'sel') {
          rowT.appendChild(field(label, '<select class="tbtn" data-mkt="' + key + '">' + opt.map((o) => '<option value="' + o[0] + '"' + (cur === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select>'));
        } else {
          rowT.appendChild(field(label, '<span class="hint">' + opt + '</span>', 'mkwide'));
        }
      });
      tf.appendChild(rowT);
      body.appendChild(tf);
    }
  }

  /* ---------- ② 它做什么 ---------- */
  {
    const body = section(MK.type === 'Joker' ? '② 它做什么（选择式，不用写代码）' : '② 它做什么');
    if (MK.type === 'Joker') {
      const pres = document.createElement('div'); pres.className = 'mkpresets';
      pres.innerHTML = '<div class="mklabel">常用预设（点一下就是一整套效果）</div>' +
        MK_PRESETS.map((p, i) => '<button class="mkpreset" data-preset="' + i + '">' + p[0] + '</button>').join('');
      body.appendChild(pres);
      const list = document.createElement('div'); list.className = 'mkfxlist';
      MK.effects.forEach((e, i) => {
        const row = document.createElement('div'); row.className = 'mkfx mkfx-' + e.eff;
        const opts = (arr, cur) => arr.map((o) => '<option value="' + o[0] + '"' + (cur === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('');
        let condVal = '';
        if (e.cond === 'suit') condVal = '<select class="tbtn" data-fx="' + i + '" data-f="condVal">' + opts(MK_SUITS, e.condVal) + '</select>';
        else if (e.cond === 'enh') condVal = '<select class="tbtn" data-fx="' + i + '" data-f="condVal">' + opts(MK_ENH, e.condVal) + '</select>';
        else if (e.cond === 'edition') condVal = '<select class="tbtn" data-fx="' + i + '" data-f="condVal">' + opts(MK_EDITION, e.condVal) + '</select>';
        else if (e.cond === 'seal') condVal = '<select class="tbtn" data-fx="' + i + '" data-f="condVal">' + opts(MK_SEAL, e.condVal) + '</select>';
        else if (e.cond === 'rank') condVal = '<select class="tbtn" data-fx="' + i + '" data-f="condVal">' + opts(MK_RANKS, e.condVal) + '</select>';
        else if (e.cond === 'hand') condVal = '<select class="tbtn" data-fx="' + i + '" data-f="condVal">' + opts(D.hands.slice().sort((x, y) => (y.order || 0) - (x.order || 0)).map((h) => [h.name, handCN(h)]), e.condVal) + '</select>';
        else if (e.cond === 'count' || e.cond === 'deckcount') condVal = '<input class="tbtn mkn" type="number" min="1" max="99" data-fx="' + i + '" data-f="condVal" value="' + (e.condVal || (e.cond === 'count' ? 5 : 40)) + '">';
        row.innerHTML = '<i class="mknum">' + (i + 1) + '</i>' +
          '<span class="mkword">当</span><select class="tbtn" data-fx="' + i + '" data-f="when">' + opts(MK_WHEN, e.when) + '</select>' +
          '<span class="mkword">且</span><select class="tbtn" data-fx="' + i + '" data-f="cond">' + opts(MK_COND, e.cond) + '</select>' + condVal +
          '<span class="mkword">则给</span><select class="tbtn" data-fx="' + i + '" data-f="eff">' + opts(MK_EFF, e.eff) + '</select>' +
          '<input class="tbtn mkn" type="number" step="0.5" data-fx="' + i + '" data-f="val" value="' + e.val + '">' +
          '<button class="btn warn mkx" data-del="' + i + '" title="删掉这一行">✕</button>';
        list.appendChild(row);
      });
      body.appendChild(list);
      const descBox = document.createElement('div'); descBox.className = 'mkdescbox';
      descBox.innerHTML = '<div class="mklabel">游戏里会显示成（跟着上面的选择实时变）</div><div class="mkdesc" id="mkDesc">' + mkDescHtml() + '</div>';
      body.appendChild(descBox);
      const addRow = document.createElement('div'); addRow.className = 'mkbtnrow';
      addRow.innerHTML = '<button class="btn" id="mkAddFx">＋ 加一条效果</button>' +
        '<button class="btn" id="mkAutoText">按上面的效果生成描述</button>';
      body.appendChild(addRow);
    } else {
      const row = document.createElement('div'); row.className = 'mkrow';
      row.appendChild(field('属于哪一类', '<select class="tbtn" id="mkSet">' + MK_SETS.map((x) => '<option value="' + x[0] + '"' + (MK.set === x[0] ? ' selected' : '') + '>' + x[1] + '</option>').join('') + '</select>'));
      row.appendChild(field('使用效果', '<select class="tbtn" id="mkUse">' + MK_USE.map((u) => '<option value="' + u[0] + '"' + (MK.useKind === u[0] ? ' selected' : '') + '>' + u[1] + '</option>').join('') + '</select>'));
      row.appendChild(field('数值', '<input class="tbtn mkn" type="number" id="mkUseVal" value="' + MK.useVal + '">'));
      body.appendChild(row);
      body.insertAdjacentHTML('beforeend', '<div class="hint">非小丑牌类型这一版做「外观 + 文案 + 类型专属设置 + 一个使用效果」，更细的逻辑到第 ⑤ 段的高级里补。</div>');
    }
  }

  /* ---------- ③ 名字与描述 ---------- */
  {
    const body = section('③ 名字与描述');
    const row = document.createElement('div'); row.className = 'mkrow';
    row.appendChild(field('名字（中文）', '<input class="tbtn" data-mk="nameZh">'));
    row.appendChild(field('名字（英文）', '<input class="tbtn" data-mk="nameEn">'));
    body.appendChild(row);
    const row2 = document.createElement('div'); row2.className = 'mkrow';
    row2.appendChild(field('描述（中文，留空按效果自动生成）', '<input class="tbtn" data-mk="textZh" id="mkTextZh">', 'mkwide'));
    body.appendChild(row2);
  }

  /* ---------- ④ 数值与兼容性 ---------- */
  {
    const body = section('④ 数值与兼容性');
    const row = document.createElement('div'); row.className = 'mkrow';
    row.appendChild(field('稀有度', '<select class="tbtn" data-mk="rarity">' + MK_RARITY.map((r) => '<option value="' + r[0] + '"' + (MK.rarity === r[0] ? ' selected' : '') + '>' + r[1] + '</option>').join('') + '</select>'));
    row.appendChild(field('价格', '<input class="tbtn mkn" type="number" data-mk="cost">'));
    row.appendChild(field('出现权重', '<input class="tbtn mkn" type="number" data-mk="weight">'));
    row.appendChild(field('排序', '<input class="tbtn mkn" type="number" data-mk="order">'));
    body.appendChild(row);
    const row2 = document.createElement('div'); row2.className = 'mkrow';
    [['eternal', '可以永恒'], ['perishable', '可以易腐'], ['blueprint', '可被蓝图复制']].forEach((f) => {
      row2.appendChild(field(f[1], '<input type="checkbox" data-mkflag="' + f[0] + '"' + (MK[f[0]] ? ' checked' : '') + '>', 'mkck'));
    });
    body.appendChild(row2);
  }

  /* ---------- ⑤ 高级 ---------- */
  {
    const body = section('⑤ 高级（可跳过）');
    const row = document.createElement('div'); row.className = 'mkrow';
    row.appendChild(field('条目 key', '<input class="tbtn" data-mk="key">'));
    row.appendChild(field('mod 名称', '<input class="tbtn" data-mk="modName">'));
    body.appendChild(row);
    const row2 = document.createElement('div'); row2.className = 'mkrow';
    row2.appendChild(field('config 覆盖（JSON，可留空）', '<input class="tbtn mono" data-mk="config" placeholder="（不用填）">', 'mkwide'));
    body.appendChild(row2);
    body.insertAdjacentHTML('beforeend', '<div class="hint">生成的 Lua（可以直接改；改了就不再被上面的选项覆盖，点「重新生成」会覆盖你的改动）：</div>');
    const ta = document.createElement('textarea'); ta.id = 'mkLua'; ta.className = 'mklua'; ta.spellcheck = false;
    body.appendChild(ta);
    const row3 = document.createElement('div'); row3.className = 'mkbtnrow';
    row3.innerHTML = '<button class="btn" id="mkRegen">↻ 按上面的选项重新生成</button><button class="btn" id="mkApplyCfg">把 config JSON 写进 Lua</button>';
    body.appendChild(row3);
  }

  /* ---------- 事件（都在同一个作用域里按 id 找） ---------- */
  const q = (sel) => root.querySelector(sel);
  const qa = (sel) => [].slice.call(root.querySelectorAll(sel));
  const status = (t, cls) => { const el = q('#mkStatus'); if (el) { el.textContent = t; el.className = 'hint' + (cls ? ' ' + cls : '') } };
  MKEL.status = status;
  const refresh = () => {
    const sum = q('#mkSum'); if (sum) sum.innerHTML = mkSummaryHtml();
    const d = q('#mkDesc'); if (d) d.innerHTML = mkDescHtml();
    const line = q('.mkpvline');
    if (line) line.innerHTML = '<div class="mkpvname"><b>' + esc(MK.nameZh || MK.key) + '</b>' + mkTag() + '</div>' +
      '<div class="mkpvfx">' + esc(mkShownText() || mkPlaceholderText()) + '</div>';
    /* 「照谁做的」只是备注：下面所有字段都能继续改 */
    const ch = q('#mkCloneHint');
    if (ch) {
      const src = MK.cloneFrom ? BY_ID[MK.cloneFrom] : null;
      ch.innerHTML = src
        ? ('已照「' + esc(nm(src, 'zh_CN')) + '」复制了一份 —— <b>下面所有内容都能继续改</b>（贴图 / 名字 / 原文 / 效果 / 价格 / 稀有度 / 权重 / 这个类型的专属设置），这个标记只是备注，不是锁。想换个起点就再选一张或点别的图格子。')
        : '';
    }
    if (!MK.luaDirty) { const ta2 = q('#mkLua'); if (ta2) ta2.value = mkLua() }
  };
  /* 所有段落都建完了，把「前置要求」那块挂到最底部 */
  if (mkNeedBoxEl) {
    /* 插到最后一个功能段后面（后面的段落可能在别的容器里，所以按 DOM 里最后一个 .opt 定位） */
    const opts2 = document.querySelectorAll('.mkright .opt');
    const last2 = opts2.length ? opts2[opts2.length - 1] : null;
    if (last2 && last2.parentElement) last2.parentElement.insertBefore(mkNeedBoxEl, last2.nextSibling);
    else if (mkSectionParent) mkSectionParent.appendChild(mkNeedBoxEl);
  }
  MKEL.refresh = refresh;
  refresh();   /* 渲染完先把摘要 / 描述 / 预览那句 / Lua 框填上（以前只定义没调用，Lua 框一开始是空的） */
  /* 重入保护：render() 里如果再触发一次 render（点某些按钮时会发生），直接返回，
     否则会一路递归到爆栈（用户报告：点第一条效果的 ✕ 就 Maximum call stack size exceeded） */
  let redrawing = false;
  const redraw = () => {
    if (redrawing) return;
    redrawing = true;
    try { render() } finally { redrawing = false }
  };
  MKEL.redraw = redraw;

  /* 工程字段（Mod id / 名称 / 作者 / 版本 / 前缀 / 说明）：改了就存，并刷新 Lua */
  qa('[data-mkp]').forEach((el) => el.addEventListener('input', () => {
    MKR[el.dataset.mkp] = el.value;
    mkSaveProject();
    refresh();
  }));
  /* 基本输入 */
  qa('[data-mk]').forEach((el) => {
    const k = el.dataset.mk;
    const val = MK[k];
    if (el.tagName === 'SELECT') el.value = val == null ? '' : val;
    else el.value = val == null ? '' : val;
    const ev = el.tagName === 'SELECT' ? 'change' : 'input';
    el.addEventListener(ev, () => {
      MK[k] = el.type === 'number' ? Number(el.value) : el.value;
      if (el.tagName === 'SELECT' || el.type === 'number') { redraw(); return }
      refresh();
    });
  });
  qa('[data-mkflag]').forEach((el) => el.addEventListener('change', () => mkSet({ [el.dataset.mkflag]: el.checked })));
  qa('[data-mkt]').forEach((el) => {
    const k = el.dataset.mkt;
    const ev = (el.tagName === 'SELECT' || el.type === 'checkbox') ? 'change' : 'input';
    el.addEventListener(ev, () => {
      MK.t[k] = el.type === 'checkbox' ? el.checked : (el.type === 'number' ? Number(el.value) || 0 : el.value);
      /* 名称行的胶囊与描述都跟类型设置有关，所以整块刷新一次（不是只刷 Lua） */
      redraw();
    });
  });
  const luaEl = q('#mkLua'); if (luaEl) luaEl.addEventListener('input', () => { MK.lua = luaEl.value; MK.luaDirty = true });
  const rg = q('#mkRegen'); if (rg) rg.onclick = () => { MK.luaDirty = false; MK.lua = null; redraw() };
  const ac = q('#mkApplyCfg'); if (ac) ac.onclick = () => { const l = q('#mkLua'); if (l && MK.config) { l.value = l.value.replace(/config = \{[\s\S]*?\n    \},/, 'config = ' + MK.config + ','); MK.lua = l.value; MK.luaDirty = true } };
  const af = q('#mkAddFx'); if (af) af.onclick = () => mkSet({ effects: MK.effects.concat([{ when: 'card', cond: '', condVal: '', eff: 'mult', val: 4 }]) });
  const at = q('#mkAutoText'); if (at) at.onclick = () => mkSet({ textZh: mkAutoText('zh'), textEn: mkAutoText('en') });

  /* 图集 / 上传 / 立绘 */
  const as = q('#mkAtlas'); if (as) as.onchange = () => mkSet({ art: Object.assign({}, MK.art, { atlas: as.value, pos: { x: 0, y: 0 }, upload: null, uploadName: '', frames: null, animated: false }) });
  const up = q('#mkUpload');
  if (up) up.onchange = async (e) => {
    const fl = [].slice.call(e.target.files || []);
    if (!fl.length) return;
    /* 多选：每张图当一帧（不挑格式，动图拆不了也能这么用） */
    if (fl.length > 1) {
      const got = [];
      for (const one of fl) { const i2 = await mkReadImage(one); if (i2) got.push(i2.frames[0] || i2.cover) }
      if (got.length < 2) { status('这几张图读不出来，换几张试试'); return }
      const fps0 = (MK.art.gen && MK.art.gen.fps) || 10;
      mkSet({ art: Object.assign({}, MK.art, { upload: got[0], frames: got, animated: true, delay: Math.round(1000 / fps0), weights: null, speed: 2, uploadName: fl.length + ' 张图（每张一帧）' }) });
      status('已用 ' + got.length + ' 张图拼成动图：预览在动，导出铺成横向帧序列，Lua 里写 frames = ' + got.length + '（帧率按当前 ' + fps0 + 'fps）。', 'ok');
      mkStartAnim(Math.round(1000 / fps0));
      return;
    }
    const f = fl[0];
    const info = await mkReadImage(f);
    if (!info) { status('这张图读不了（格式不支持）'); return }
    const multi = info.frames.length > 1;
    /* 导入的动图默认 2× 慢放：原来「就按动图本身的时长」在游戏里显得太短（用户反馈） */
    mkSet({ art: Object.assign({}, MK.art, { upload: info.frames[0] || info.cover, frames: multi ? info.frames : null, animated: multi, delay: info.delay || 0, delays: (multi && info.delays) ? info.delays : null, weights: null, speed: multi ? 2 : 1, uploadName: f.name }) });
    if (multi) {
      status('已使用「' + f.name + '」：动图拆出 ' + info.frames.length + ' 帧（每帧 ' + (info.delay || '?') + 'ms），预览按这个节奏逐帧播放，导出会铺成横向帧序列、Lua 里写 frames = ' + info.frames.length + '。', 'ok');
      mkStartAnim(info.delay);
    } else if (info.gif) status('已使用「' + f.name + '」：这是一个只有 1 帧的 GIF，按静态图用。');
    else if (info.apng) status('已使用「' + f.name + '」：这个 PNG 里只有 1 帧，按静态图用。');
    else if (/webp/i.test(f.type || '') || /\.webp$/i.test(f.name || '')) status('已使用「' + f.name + '」（单帧）。动图 WebP 拆帧要靠浏览器内核，这个环境给不了 —— GIF 和 APNG 都能拆。');
    else status('已使用「' + f.name + '」（单帧，按静态图用）。');
  };
  /* 动效控件：预设 / 帧数 / 帧率 / 幅度 —— 改完立刻按新参数生成帧并让预览动起来 */
  const mkSetGen = (which, patch) => {
    const cur = (which === 'soul' ? MK.soul : MK.art).gen || { kind: '', n: 8, fps: 10, amp: 3 };
    const gen = Object.assign({}, cur, patch);
    const next = which === 'soul'
      ? { soul: Object.assign({}, MK.soul, { gen: gen }) }
      : { art: Object.assign({}, MK.art, { gen: gen }) };
    mkSet(next);
    if (gen.kind && gen.n > 1) {
      mkStartAnim(Math.round(1000 / gen.fps));
      status('已按「' + mkMotionName(gen.kind) + '」生成 ' + gen.n + ' 帧 · ' + gen.fps + 'fps：预览在动，导出铺成横向帧序列，Lua 里是 atlas_table = ANIMATION_ATLAS + frames = ' + gen.n + ' + fps = ' + gen.fps + '。', 'ok');
    } else {
      status('已关掉动效预设：有导入的帧序列就用导入的，没有就是静态。');
    }
  };
  /* 逐帧时长：改任意一格的倍数 → 存下来 → 预览按新时长重排 */
  qa('[data-frame]').forEach((el) => el.addEventListener('change', () => {
    const listNow = mkSourceFrames(MK.art);
    const cnt = listNow ? listNow.length : 0;
    if (cnt < 2) return;
    const w = new Array(cnt).fill(1);
    qa('[data-frame]').forEach((x) => { w[Number(x.dataset.frame)] = Math.max(1, Math.min(99, Number(x.value) || 1)) });
    mkSet({ art: Object.assign({}, MK.art, { weights: w }) });
    mkStartAnim(0);
    status('每帧时长已更新：' + w.join(' / ') + '（倍数）—— 导出会写成 sprite_args.frame_durations。');
  }));
  const mo = q('#mkMotion'); if (mo) mo.onchange = () => mkSetGen('art', { kind: mo.value });
  const mn = q('#mkMotionN'); if (mn) mn.onchange = () => mkSetGen('art', { n: Number(mn.value) });
  const mf = q('#mkMotionFps'); if (mf) mf.onchange = () => mkSetGen('art', { fps: Number(mf.value) });
  const ma = q('#mkMotionAmp'); if (ma) ma.oninput = () => mkSetGen('art', { amp: Number(ma.value) });
  const spdEl = q('#mkSpeed');
  if (spdEl) spdEl.onchange = () => {
    const v = Number(spdEl.value) || 1;
    mkSet({ art: Object.assign({}, MK.art, { speed: v }) });
    const d = mkFrameDelays(MK.art);
    mkStartAnim(d.length > 1 ? d[0] : 0);
    status('播放速度：' + v + '×（每帧大约 ' + (d.length > 1 ? d[0] : '?') + 'ms）—— 导出时会换算成 fps 写进 Lua。');
  };
  const sm2 = q('#mkSoulMotion'); if (sm2) sm2.onchange = () => mkSetGen('soul', { kind: sm2.value });
  const so = q('#mkSoulOn');
  if (so) so.onchange = () => { mkSet({ soul: Object.assign({}, MK.soul, { on: so.checked }) }); if (so.checked && (MK.soul.frames || []).length > 1) mkStartAnim() };
  const sa = q('#mkSoulAtlas');
  if (sa) sa.onchange = () => mkSet({ soul: Object.assign({}, MK.soul, { atlas: sa.value, pos: { x: 0, y: 0 }, upload: null, uploadName: '', frames: null }) });
  const sp = q('#mkSoulPick');
  if (sp) sp.onclick = () => { artTarget = artTarget === 'soul' ? 'art' : 'soul'; status(artTarget === 'soul' ? '网格现在给「悬浮立绘」选格子（再点一次切回主体）' : '网格切回给主体选格子'); redraw() };
  const su = q('#mkSoulUp');
  if (su) su.onchange = async (e) => {
    const fl = [].slice.call(e.target.files || []);
    if (!fl.length) return;
    if (fl.length > 1) {
      const got = [];
      for (const one of fl) { const i2 = await mkReadImage(one); if (i2) got.push(i2.frames[0] || i2.cover) }
      if (got.length < 2) { status('这几张立绘图读不出来'); return }
      const fps1 = (MK.soul.gen && MK.soul.gen.fps) || 10;
      mkSet({ soul: Object.assign({}, MK.soul, { on: true, upload: got[0], frames: got, delay: Math.round(1000 / fps1), uploadName: fl.length + ' 张图（每张一帧）' }) });
      status('立绘已用 ' + got.length + ' 张图拼成动图（帧率按当前 ' + fps1 + 'fps），预览里会飘着动。', 'ok');
      mkStartAnim(Math.round(1000 / fps1));
      return;
    }
    const f = fl[0];
    const info = await mkReadImage(f);
    if (!info) { status('这张立绘图读不了'); return }
    const multi = info.frames.length > 1;
    mkSet({ soul: Object.assign({}, MK.soul, { on: true, upload: info.frames[0] || info.cover, frames: multi ? info.frames : null, delay: info.delay || 0, delays: (multi && info.delays) ? info.delays : null, weights: null, uploadName: f.name }) });
    status('立绘已换成「' + f.name + '」' + (multi ? '（动图 ' + info.frames.length + ' 帧，每帧 ' + (info.delay || '?') + 'ms，预览里会飘着动）' : '') + '，预览里现在就能看到。', 'ok');
    mkStartAnim(multi ? info.delay : 0);
  };

  /* 效果行 / 预设 / 删除 */
  qa('[data-preset]').forEach((el) => el.addEventListener('click', () => {
    const p = MK_PRESETS[Number(el.dataset.preset)];
    mkSet({ effects: p[1].map((x) => Object.assign({}, x)), textZh: '', textEn: '' });
    status('已套用预设「' + p[0] + '」—— 数值和条件都能再改。');
  }));
  qa('[data-fx]').forEach((el) => {
    const i = Number(el.dataset.fx), f = el.dataset.f;
    el.addEventListener('change', () => {
      const list = MK.effects.slice();
      list[i] = Object.assign({}, list[i]);
      list[i][f] = el.type === 'number' ? Number(el.value) : el.value;
      if (f === 'cond' && el.value === 'suit') list[i].condVal = 'Hearts';
      if (f === 'cond' && el.value === 'enh') list[i].condVal = 'm_bonus';
      if (f === 'cond' && el.value === 'edition') list[i].condVal = 'e_foil';
      if (f === 'cond' && el.value === 'seal') list[i].condVal = 'Red';
      if (f === 'cond' && el.value === 'rank') list[i].condVal = 'King';
      if (f === 'cond' && el.value === 'hand') list[i].condVal = (D.hands[0] || {}).name;
      if (f === 'cond' && el.value === 'count') list[i].condVal = 5;
      if (f === 'cond' && el.value === 'deckcount') list[i].condVal = 40;
      if (f === 'eff' && el.value === 'reps' && !Number(list[i].val)) list[i].val = 1;
      mkSet({ effects: list });
    });
  });
  qa('[data-del]').forEach((el) => el.addEventListener('click', () => {
    const list = MK.effects.slice(); list.splice(Number(el.dataset.del), 1);
    mkSet({ effects: list });
  }));
  const us = q('#mkUse'); if (us) us.onchange = () => mkSet({ useKind: us.value });
  const uv = q('#mkUseVal'); if (uv) uv.oninput = () => { MK.useVal = Number(uv.value) || 0; refresh() };
  const st2 = q('#mkSet'); if (st2) st2.onchange = () => mkSet({ set: st2.value });

  /* 克隆：照现成的牌做一个（原版 + mod） */
/** 照某张现成的牌做（图 + 名字 + 原文 + 效果 + 数值），下拉和网格格子共用这一份逻辑 */
function mkApplyCloneFrom (id) {
  const it = BY_ID[id];
  if (!it) return false;
  const cfg = it.config || {};
  const effects = [];
  const SUIT_CN2 = { Diamonds: '♦', Hearts: '♥', Spades: '♠', Clubs: '♣' };
  const suitRaw2 = (cfg.extra && cfg.extra.suit) || (it.raw && it.raw.suit) || it.suit || '';
  const cond2 = SUIT_CN2[suitRaw2] ? 'suit' : '';
  const condVal2 = cond2 ? SUIT_CN2[suitRaw2] : '';
  const push2 = (when, kind, v) => { if (v) effects.push({ when: when, cond: cond2, condVal: condVal2, eff: kind, val: v }) };
  /* 图鉴里牌组的 cat 是 Deck，制作器里这个类型叫 Back —— 不映射的话会设成一个不存在的类型，专属设置整块不显示 */
  const typeOut = it.cat === 'Deck' ? 'Back' : (it.cat === 'Joker' ? 'Joker' : (it.cat === 'Consumable' ? 'Consumable' : it.cat));
  push2('hand', 'chips', cfg.t_chips); push2('hand', 'mult', cfg.t_mult); push2('hand', 'xmult', cfg.x_mult);
  if (cfg.extra && typeof cfg.extra === 'object') {
    push2('card', 'chips', cfg.extra.chips); push2('card', 'mult', cfg.extra.mult); push2('card', 'xmult', cfg.extra.x_mult);
  }
  const rule2 = (typeof JOKER_RULES !== 'undefined' && JOKER_RULES.rules ? JOKER_RULES.rules : []).filter((r) => r.n === it.name)[0];
  if (rule2 && rule2.e) {
    const seen2 = {};
    rule2.e.forEach((ex) => {
      const f2 = ex.split('=')[0];
      const kind2 = /^x_mult|^Xmult_mod/.test(f2) ? 'xmult' : /^mult|^t_mult|^mult_mod/.test(f2) ? 'mult' : /^chips|^chip_mod|^t_chips/.test(f2) ? 'chips' : /dollars/.test(f2) ? 'dollars' : null;
      if (!kind2 || seen2[kind2]) return;
      seen2[kind2] = true;
      const cand2 = [(cfg.extra || {})[f2], (cfg.extra || {}).chips, (cfg.extra || {}).mult, (cfg.extra || {}).x_mult, cfg[f2], cfg.t_chips, cfg.t_mult, cfg.x_mult, cfg.chips, cfg.mult];
      const num2 = cand2.filter((v) => typeof v === 'number' && isFinite(v))[0];
      if (typeof num2 !== 'number') return;
      effects.push({ when: rule2.r === 'individual' ? 'card' : (rule2.r === 'repetition' ? 'repetition' : 'hand'), cond: cond2, condVal: condVal2, eff: kind2, val: num2 });
    });
  }
  /* ② 把这张牌的专属内容搬进 MK.t（该类型的字段组直接读它）—— 能读到才搬，读不到留默认，不编 */
  const t2 = {};   /* 从空开始：照一张新牌做就以它为准，别把上一张牌的专属值留下（实测克隆塔罗后残留过小丑的 mult/chips） */
  const cfgx = Object.assign({}, (it.config || {}), ((it.config && it.config.extra) || {}));
  const rawx = it.raw || {};
  let setOut = MK.set;
  if (it.cat === 'Tarot' || it.cat === 'Planet' || it.cat === 'Spectral') setOut = it.cat;
  if (typeOut === 'Blind') {
    const boss = rawx.boss || (it.config && it.config.boss) || {};
    if (typeof boss.min === 'number') t2.boss_min = boss.min;
    if (typeof boss.max === 'number') t2.boss_max = boss.max;
    if (typeof cfgx.mult === 'number') t2.blind_mult = cfgx.mult;
    if (typeof cfgx.dollars === 'number') t2.blind_dollars = cfgx.dollars;
    const db = (it.config && it.config.debuff) || rawx.debuff || {};
    if (db && db.suit) t2.debuff_suit = db.suit;
    if (db && db.is_face) t2.debuff_face = true;
  } else if (typeOut === 'Booster') {
    const kk = rawx.kind || cfgx.kind;
    if (kk) t2.kind = kk;
    if (typeof cfgx.choose === 'number') t2.choose = cfgx.choose;
    if (typeof cfgx.extra === 'number') t2.extra = cfgx.extra;
  } else if (typeOut === 'Back') {
    ['hand_size', 'hands', 'discards', 'dollars', 'joker_slot', 'consumable_slot', 'joker_slots'].forEach((k) => {
      const v = (typeof cfgx[k] === 'number') ? cfgx[k] : (typeof rawx[k] === 'number' ? rawx[k] : null);
      if (typeof v === 'number') t2[(k === 'joker_slots' ? 'joker_slot' : k)] = v;
    });
  } else if (typeOut === 'Voucher') {
    if (typeof cfgx.voucher_val === 'number') t2.voucher_val = cfgx.voucher_val;
  }
  /* 兜底：config 里的数字 / 字符串 / 开关，同名键原样搬进 t（UI 里同名键会直接显示出来） */
  Object.keys(cfgx).forEach((k) => {
    const v = cfgx[k];
    if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') { if (t2[k] === undefined) t2[k] = v }
  });
  const tCount = Object.keys(t2).length;
  const zh2 = (it.text && it.text.zh_CN) || [];
  mkSet({
    cloneFrom: it.id,
    type: typeOut,
    key: mkUniqueKey('my' + String(it.key || it.id).replace(/^[a-z]+_/, '')),
    art: { atlas: it.atlas || MK.art.atlas, pos: it.pos || { x: 0, y: 0 }, upload: null, uploadName: '', frames: null, animated: false, weights: null, gen: null, delays: null, speed: 1 },
    nameZh: nm(it, 'zh_CN'), nameEn: nm(it, 'en-us'), textZh: zh2.join(' '), textEn: ((it.text && it.text['en-US']) || (it.text && it.text['en-us']) || []).join(' '),
    rarity: it.rarity || MK.rarity, cost: it.cost || MK.cost, order: it.order || MK.order, weight: it.weight || MK.weight,
    effects: effects.length ? effects : MK.effects,
    set: setOut,
    t: t2,
  });
  return { effects: effects.length, tKeys: tCount };
}
  mkApplyCloneImpl = mkApplyCloneFrom;   /* 挂到模块级变量，外部就能调到了 */
  const cs = q('#mkClone');
  if (cs) cs.onchange = () => {
    const it = BY_ID[cs.value];
    if (!it) return;
    mkApplyCloneFrom(cs.value);   /* 逻辑在上面的 mkApplyCloneFrom 里，网格格子用的是同一份 */
    return;
    /* eslint-disable no-unreachable */
    const cfg = it.config || {};
    const effects = [];
    /* 花色 / 点数条件能读出来就带上（贪婪小丑那种「方片才给加成」要带） */
    const SUIT_CN = { Diamonds: '♦', Hearts: '♥', Spades: '♠', Clubs: '♣' };
    const suitRaw = (cfg.extra && cfg.extra.suit) || (it.raw && it.raw.suit) || it.suit || '';
    const cond = SUIT_CN[suitRaw] ? 'suit' : '';
    const condVal = cond ? SUIT_CN[suitRaw] : '';
    const push = (when, kind, v) => { if (v) effects.push({ when, cond: cond, condVal: condVal, eff: kind, val: v }) };
    push('hand', 'chips', cfg.t_chips); push('hand', 'mult', cfg.t_mult); push('hand', 'xmult', cfg.x_mult);
    if (cfg.extra && typeof cfg.extra === 'object') {
      push('card', 'chips', cfg.extra.chips); push('card', 'mult', cfg.extra.mult); push('card', 'xmult', cfg.extra.x_mult);
    }
    const rule = (typeof JOKER_RULES !== 'undefined' && JOKER_RULES.rules ? JOKER_RULES.rules : []).filter((r) => r.n === it.name)[0];
    if (rule && rule.e) {
      const seen = {};
      rule.e.forEach((ex) => {
        const f = ex.split('=')[0];
        const kind = /^x_mult|^Xmult_mod/.test(f) ? 'xmult' : /^mult|^t_mult|^mult_mod/.test(f) ? 'mult' : /^chips|^chip_mod|^t_chips/.test(f) ? 'chips' : /dollars/.test(f) ? 'dollars' : null;
        if (!kind || seen[kind]) return;
        seen[kind] = true;
        /* 只用这张牌数据里**真实存在**的数字；找不到就不编 —— 以前兜底成 4，于是选什么都是「+4 倍率」 */
        const cand = [(cfg.extra || {})[f], (cfg.extra || {}).chips, (cfg.extra || {}).mult, (cfg.extra || {}).x_mult, cfg[f], cfg.t_chips, cfg.t_mult, cfg.x_mult, cfg.chips, cfg.mult];
        const num = cand.filter((v) => typeof v === 'number' && isFinite(v))[0];
        if (typeof num !== 'number') return;   /* 拆不出数值就跳过这条，下面会如实告诉用户 */
        effects.push({ when: rule.r === 'individual' ? 'card' : (rule.r === 'repetition' ? 'repetition' : 'hand'), cond: '', condVal: '', eff: kind, val: typeof num === 'number' ? num : 4 });
      });
    }
    const zh = (it.text && it.text.zh_CN) || [];
    mkSet({
      cloneFrom: it.id,
      type: it.cat === 'Joker' ? 'Joker' : (it.cat === 'Consumable' ? 'Consumable' : it.cat),
      key: 'my' + String(it.key || it.id).replace(/^[a-z]+_/, ''),
      art: { atlas: it.atlas || MK.art.atlas, pos: it.pos || { x: 0, y: 0 }, upload: null, uploadName: '', frames: null, animated: false },
      nameZh: nm(it, 'zh_CN'), nameEn: nm(it, 'en-us'), textZh: zh.join(' '), textEn: ((it.text && it.text['en-US']) || (it.text && it.text['en-us']) || []).join(' '),
      rarity: it.rarity || MK.rarity, cost: it.cost || MK.cost, order: it.order || MK.order, weight: it.weight || MK.weight,
      effects: effects.length ? effects : MK.effects,
    });
    if (effects.length) status('已照「' + nm(it, 'zh_CN') + '」复制一份：类型/贴图/数值/文案/效果都进来了（' + effects.length + ' 条效果），改完导出就是你的新条目。', 'ok');
    else status('已照「' + nm(it, 'zh_CN') + '」复制一份：类型/贴图/数值/原文都进来了，但**这张牌的效果没法从数据里自动拆成数值**（它的逻辑在游戏源码里是代码）—— 描述里已经是你选的这张牌的原文，效果请在下面「它做什么」里自己挑一条，或直接改生成的 Lua。', '');
  };

  /* 导出 / 自检 / 复制 */
  const zb = q('#mkZip');
  if (zb) zb.onclick = async () => {
    status('正在打包…');
    try {
      const files = await mkBuildFiles();
      const bytes = zipStore(files);
      save(bytes, MKR.modId + '.zip', 'application/zip');
      status('已生成 ' + MKR.modId + '.zip（' + files.length + ' 个文件 / ' + MKR.items.length + ' 个条目 / ' + Math.round(bytes.length / 1024) + ' KB）—— 注意：**先解压**，把解压出来的文件夹整个放进 %AppData%/Balatro/Mods/ 再重启游戏。Steamodded 不读 zip（放 zip 进去游戏里不会有任何反应）。', 'ok');
    } catch (e) { status('打包失败：' + e.message) }
  };
  const ck = q('#mkCheck');
  if (ck) ck.onclick = async () => {
    status('正在自检（用图鉴自己的解析器把这份 mod 读一遍）…');
    try {
      const files = await mkBuildFiles();
      const res = await importZipBuffer(zipStore(files), MKR.modId);
      const mod = res && res.mod;
      const ok = res && res.ok !== false;
      status((ok ? '自检通过：' : '自检有问题：') + (mod ? (mod.items + ' 个条目 / ' + mod.atlases + ' 个图集 / ' + mod.warnings.length + ' 条警告') : JSON.stringify(res)) +
        (mod && mod.warnings.length ? ' —— ' + mod.warnings.slice(0, 2).join('；') : ' —— 它已经出现在「图鉴」里了（左侧来源可选到它）。'), ok ? 'ok' : '');
    } catch (e) { status('自检失败：' + e.message) }
  };
  const cp = q('#mkCopy');
  if (cp) cp.onclick = () => {
    const l = q('#mkLua');
    const txt = (l && MK.luaDirty) ? l.value : mkLua();
    if (navigator.clipboard) navigator.clipboard.writeText(txt).then(() => status('Lua 已复制到剪贴板。', 'ok'), () => status('复制失败，请手动选中文本框复制。'));
    else status('这个浏览器不给剪贴板权限，请手动选中文本框复制。');
  };

  /* 动图：每次渲染重新起播（旧定时器挂在旧 DOM 上会自杀） */
  if (mkAnimTimer) { clearInterval(mkAnimTimer); mkAnimTimer = null }
  if ((MK.art.frames && MK.art.frames.length > 1) || (MK.soul.frames && MK.soul.frames.length > 1)) mkStartAnim(MK.art.delay || 0);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
