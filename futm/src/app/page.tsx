'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, type Profile } from '@/lib/supabase'

type Page = 'home'|'match'|'drills'|'ranking'|'shop'|'calendar'|'profile'|'standings'|'jogos'
type RankEntry = { username: string; team: string; goals_season: number; goals_today: number; position: number }

const TEAMS = [
  {id:'palmeiras',name:'Palmeiras',abbr:'PAL',primary:'#006437',secondary:'#FFFFFF'},
  {id:'flamengo',name:'Flamengo',abbr:'FLA',primary:'#CC0000',secondary:'#000000'},
  {id:'fluminense',name:'Fluminense',abbr:'FLU',primary:'#6A0F28',secondary:'#3C5C2C'},
  {id:'saopaulo',name:'São Paulo',abbr:'SPF',primary:'#FFFFFF',secondary:'#CC0000'},
  {id:'athletico',name:'Athletico-PR',abbr:'CAP',primary:'#CC0000',secondary:'#000000'},
  {id:'bahia',name:'Bahia',abbr:'BAH',primary:'#0066CC',secondary:'#CC0000'},
  {id:'coritiba',name:'Coritiba',abbr:'CFC',primary:'#006400',secondary:'#FFFFFF'},
  {id:'botafogo',name:'Botafogo',abbr:'BOT',primary:'#111111',secondary:'#FFFFFF'},
  {id:'bragantino',name:'Bragantino',abbr:'BRA',primary:'#CC0000',secondary:'#FFFFFF'},
  {id:'vasco',name:'Vasco',abbr:'VAS',primary:'#111111',secondary:'#FFFFFF'},
  {id:'gremio',name:'Grêmio',abbr:'GRE',primary:'#0066CC',secondary:'#111111'},
  {id:'cruzeiro',name:'Cruzeiro',abbr:'CRU',primary:'#0033CC',secondary:'#FFFFFF'},
  {id:'vitoria',name:'Vitória',abbr:'VIT',primary:'#CC0000',secondary:'#111111'},
  {id:'corinthians',name:'Corinthians',abbr:'COR',primary:'#111111',secondary:'#FFFFFF'},
  {id:'atleticomg',name:'Atlético-MG',abbr:'CAM',primary:'#111111',secondary:'#FFFFFF'},
  {id:'internacional',name:'Internacional',abbr:'INT',primary:'#CC0000',secondary:'#FFFFFF'},
  {id:'santos',name:'Santos',abbr:'SAN',primary:'#FFFFFF',secondary:'#111111'},
  {id:'mirassol',name:'Mirassol',abbr:'MIR',primary:'#FFD700',secondary:'#111111'},
  {id:'remo',name:'Remo',abbr:'REM',primary:'#0033CC',secondary:'#FFFFFF'},
  {id:'chapecoense',name:'Chapecoense',abbr:'CHP',primary:'#006400',secondary:'#FFFFFF'},
]


// All 38 rounds — round robin ida e volta
const ALL_FIXTURES: {home:string,away:string}[][] = [
  [{home:'palmeiras',away:'chapecoense'},{home:'flamengo',away:'remo'},{home:'fluminense',away:'mirassol'},{home:'saopaulo',away:'santos'},{home:'athletico',away:'internacional'},{home:'bahia',away:'atleticomg'},{home:'coritiba',away:'corinthians'},{home:'botafogo',away:'vitoria'},{home:'bragantino',away:'cruzeiro'},{home:'vasco',away:'gremio'}],
  [{home:'palmeiras',away:'remo'},{home:'chapecoense',away:'mirassol'},{home:'flamengo',away:'santos'},{home:'fluminense',away:'internacional'},{home:'saopaulo',away:'atleticomg'},{home:'athletico',away:'corinthians'},{home:'bahia',away:'vitoria'},{home:'coritiba',away:'cruzeiro'},{home:'botafogo',away:'gremio'},{home:'bragantino',away:'vasco'}],
  [{home:'palmeiras',away:'mirassol'},{home:'remo',away:'santos'},{home:'chapecoense',away:'internacional'},{home:'flamengo',away:'atleticomg'},{home:'fluminense',away:'corinthians'},{home:'saopaulo',away:'vitoria'},{home:'athletico',away:'cruzeiro'},{home:'bahia',away:'gremio'},{home:'coritiba',away:'vasco'},{home:'botafogo',away:'bragantino'}],
  [{home:'palmeiras',away:'santos'},{home:'mirassol',away:'internacional'},{home:'remo',away:'atleticomg'},{home:'chapecoense',away:'corinthians'},{home:'flamengo',away:'vitoria'},{home:'fluminense',away:'cruzeiro'},{home:'saopaulo',away:'gremio'},{home:'athletico',away:'vasco'},{home:'bahia',away:'bragantino'},{home:'coritiba',away:'botafogo'}],
  [{home:'palmeiras',away:'internacional'},{home:'santos',away:'atleticomg'},{home:'mirassol',away:'corinthians'},{home:'remo',away:'vitoria'},{home:'chapecoense',away:'cruzeiro'},{home:'flamengo',away:'gremio'},{home:'fluminense',away:'vasco'},{home:'saopaulo',away:'bragantino'},{home:'athletico',away:'botafogo'},{home:'bahia',away:'coritiba'}],
  [{home:'palmeiras',away:'atleticomg'},{home:'internacional',away:'corinthians'},{home:'santos',away:'vitoria'},{home:'mirassol',away:'cruzeiro'},{home:'remo',away:'gremio'},{home:'chapecoense',away:'vasco'},{home:'flamengo',away:'bragantino'},{home:'fluminense',away:'botafogo'},{home:'saopaulo',away:'coritiba'},{home:'athletico',away:'bahia'}],
  [{home:'palmeiras',away:'corinthians'},{home:'atleticomg',away:'vitoria'},{home:'internacional',away:'cruzeiro'},{home:'santos',away:'gremio'},{home:'mirassol',away:'vasco'},{home:'remo',away:'bragantino'},{home:'chapecoense',away:'botafogo'},{home:'flamengo',away:'coritiba'},{home:'fluminense',away:'bahia'},{home:'saopaulo',away:'athletico'}],
  [{home:'palmeiras',away:'vitoria'},{home:'corinthians',away:'cruzeiro'},{home:'atleticomg',away:'gremio'},{home:'internacional',away:'vasco'},{home:'santos',away:'bragantino'},{home:'mirassol',away:'botafogo'},{home:'remo',away:'coritiba'},{home:'chapecoense',away:'bahia'},{home:'flamengo',away:'athletico'},{home:'fluminense',away:'saopaulo'}],
  [{home:'palmeiras',away:'cruzeiro'},{home:'vitoria',away:'gremio'},{home:'corinthians',away:'vasco'},{home:'atleticomg',away:'bragantino'},{home:'internacional',away:'botafogo'},{home:'santos',away:'coritiba'},{home:'mirassol',away:'bahia'},{home:'remo',away:'athletico'},{home:'chapecoense',away:'saopaulo'},{home:'flamengo',away:'fluminense'}],
  [{home:'palmeiras',away:'gremio'},{home:'cruzeiro',away:'vasco'},{home:'vitoria',away:'bragantino'},{home:'corinthians',away:'botafogo'},{home:'atleticomg',away:'coritiba'},{home:'internacional',away:'bahia'},{home:'santos',away:'athletico'},{home:'mirassol',away:'saopaulo'},{home:'remo',away:'fluminense'},{home:'chapecoense',away:'flamengo'}],
  [{home:'palmeiras',away:'vasco'},{home:'gremio',away:'bragantino'},{home:'cruzeiro',away:'botafogo'},{home:'vitoria',away:'coritiba'},{home:'corinthians',away:'bahia'},{home:'atleticomg',away:'athletico'},{home:'internacional',away:'saopaulo'},{home:'santos',away:'fluminense'},{home:'mirassol',away:'flamengo'},{home:'remo',away:'chapecoense'}],
  [{home:'palmeiras',away:'bragantino'},{home:'vasco',away:'botafogo'},{home:'gremio',away:'coritiba'},{home:'cruzeiro',away:'bahia'},{home:'vitoria',away:'athletico'},{home:'corinthians',away:'saopaulo'},{home:'atleticomg',away:'fluminense'},{home:'internacional',away:'flamengo'},{home:'santos',away:'chapecoense'},{home:'mirassol',away:'remo'}],
  [{home:'palmeiras',away:'botafogo'},{home:'bragantino',away:'coritiba'},{home:'vasco',away:'bahia'},{home:'gremio',away:'athletico'},{home:'cruzeiro',away:'saopaulo'},{home:'vitoria',away:'fluminense'},{home:'corinthians',away:'flamengo'},{home:'atleticomg',away:'chapecoense'},{home:'internacional',away:'remo'},{home:'santos',away:'mirassol'}],
  [{home:'palmeiras',away:'coritiba'},{home:'botafogo',away:'bahia'},{home:'bragantino',away:'athletico'},{home:'vasco',away:'saopaulo'},{home:'gremio',away:'fluminense'},{home:'cruzeiro',away:'flamengo'},{home:'vitoria',away:'chapecoense'},{home:'corinthians',away:'remo'},{home:'atleticomg',away:'mirassol'},{home:'internacional',away:'santos'}],
  [{home:'palmeiras',away:'bahia'},{home:'coritiba',away:'athletico'},{home:'botafogo',away:'saopaulo'},{home:'bragantino',away:'fluminense'},{home:'vasco',away:'flamengo'},{home:'gremio',away:'chapecoense'},{home:'cruzeiro',away:'remo'},{home:'vitoria',away:'mirassol'},{home:'corinthians',away:'santos'},{home:'atleticomg',away:'internacional'}],
  [{home:'palmeiras',away:'athletico'},{home:'bahia',away:'saopaulo'},{home:'coritiba',away:'fluminense'},{home:'botafogo',away:'flamengo'},{home:'bragantino',away:'chapecoense'},{home:'vasco',away:'remo'},{home:'gremio',away:'mirassol'},{home:'cruzeiro',away:'santos'},{home:'vitoria',away:'internacional'},{home:'corinthians',away:'atleticomg'}],
  [{home:'palmeiras',away:'saopaulo'},{home:'athletico',away:'fluminense'},{home:'bahia',away:'flamengo'},{home:'coritiba',away:'chapecoense'},{home:'botafogo',away:'remo'},{home:'bragantino',away:'mirassol'},{home:'vasco',away:'santos'},{home:'gremio',away:'internacional'},{home:'cruzeiro',away:'atleticomg'},{home:'vitoria',away:'corinthians'}],
  [{home:'palmeiras',away:'fluminense'},{home:'saopaulo',away:'flamengo'},{home:'athletico',away:'chapecoense'},{home:'bahia',away:'remo'},{home:'coritiba',away:'mirassol'},{home:'botafogo',away:'santos'},{home:'bragantino',away:'internacional'},{home:'vasco',away:'atleticomg'},{home:'gremio',away:'corinthians'},{home:'cruzeiro',away:'vitoria'}],
  [{home:'palmeiras',away:'flamengo'},{home:'fluminense',away:'chapecoense'},{home:'saopaulo',away:'remo'},{home:'athletico',away:'mirassol'},{home:'bahia',away:'santos'},{home:'coritiba',away:'internacional'},{home:'botafogo',away:'atleticomg'},{home:'bragantino',away:'corinthians'},{home:'vasco',away:'vitoria'},{home:'gremio',away:'cruzeiro'}],
  [{home:'chapecoense',away:'palmeiras'},{home:'remo',away:'flamengo'},{home:'mirassol',away:'fluminense'},{home:'santos',away:'saopaulo'},{home:'internacional',away:'athletico'},{home:'atleticomg',away:'bahia'},{home:'corinthians',away:'coritiba'},{home:'vitoria',away:'botafogo'},{home:'cruzeiro',away:'bragantino'},{home:'gremio',away:'vasco'}],
  [{home:'remo',away:'palmeiras'},{home:'mirassol',away:'chapecoense'},{home:'santos',away:'flamengo'},{home:'internacional',away:'fluminense'},{home:'atleticomg',away:'saopaulo'},{home:'corinthians',away:'athletico'},{home:'vitoria',away:'bahia'},{home:'cruzeiro',away:'coritiba'},{home:'gremio',away:'botafogo'},{home:'vasco',away:'bragantino'}],
  [{home:'mirassol',away:'palmeiras'},{home:'santos',away:'remo'},{home:'internacional',away:'chapecoense'},{home:'atleticomg',away:'flamengo'},{home:'corinthians',away:'fluminense'},{home:'vitoria',away:'saopaulo'},{home:'cruzeiro',away:'athletico'},{home:'gremio',away:'bahia'},{home:'vasco',away:'coritiba'},{home:'bragantino',away:'botafogo'}],
  [{home:'santos',away:'palmeiras'},{home:'internacional',away:'mirassol'},{home:'atleticomg',away:'remo'},{home:'corinthians',away:'chapecoense'},{home:'vitoria',away:'flamengo'},{home:'cruzeiro',away:'fluminense'},{home:'gremio',away:'saopaulo'},{home:'vasco',away:'athletico'},{home:'bragantino',away:'bahia'},{home:'botafogo',away:'coritiba'}],
  [{home:'internacional',away:'palmeiras'},{home:'atleticomg',away:'santos'},{home:'corinthians',away:'mirassol'},{home:'vitoria',away:'remo'},{home:'cruzeiro',away:'chapecoense'},{home:'gremio',away:'flamengo'},{home:'vasco',away:'fluminense'},{home:'bragantino',away:'saopaulo'},{home:'botafogo',away:'athletico'},{home:'coritiba',away:'bahia'}],
  [{home:'atleticomg',away:'palmeiras'},{home:'corinthians',away:'internacional'},{home:'vitoria',away:'santos'},{home:'cruzeiro',away:'mirassol'},{home:'gremio',away:'remo'},{home:'vasco',away:'chapecoense'},{home:'bragantino',away:'flamengo'},{home:'botafogo',away:'fluminense'},{home:'coritiba',away:'saopaulo'},{home:'bahia',away:'athletico'}],
  [{home:'corinthians',away:'palmeiras'},{home:'vitoria',away:'atleticomg'},{home:'cruzeiro',away:'internacional'},{home:'gremio',away:'santos'},{home:'vasco',away:'mirassol'},{home:'bragantino',away:'remo'},{home:'botafogo',away:'chapecoense'},{home:'coritiba',away:'flamengo'},{home:'bahia',away:'fluminense'},{home:'athletico',away:'saopaulo'}],
  [{home:'vitoria',away:'palmeiras'},{home:'cruzeiro',away:'corinthians'},{home:'gremio',away:'atleticomg'},{home:'vasco',away:'internacional'},{home:'bragantino',away:'santos'},{home:'botafogo',away:'mirassol'},{home:'coritiba',away:'remo'},{home:'bahia',away:'chapecoense'},{home:'athletico',away:'flamengo'},{home:'saopaulo',away:'fluminense'}],
  [{home:'cruzeiro',away:'palmeiras'},{home:'gremio',away:'vitoria'},{home:'vasco',away:'corinthians'},{home:'bragantino',away:'atleticomg'},{home:'botafogo',away:'internacional'},{home:'coritiba',away:'santos'},{home:'bahia',away:'mirassol'},{home:'athletico',away:'remo'},{home:'saopaulo',away:'chapecoense'},{home:'fluminense',away:'flamengo'}],
  [{home:'gremio',away:'palmeiras'},{home:'vasco',away:'cruzeiro'},{home:'bragantino',away:'vitoria'},{home:'botafogo',away:'corinthians'},{home:'coritiba',away:'atleticomg'},{home:'bahia',away:'internacional'},{home:'athletico',away:'santos'},{home:'saopaulo',away:'mirassol'},{home:'fluminense',away:'remo'},{home:'flamengo',away:'chapecoense'}],
  [{home:'vasco',away:'palmeiras'},{home:'bragantino',away:'gremio'},{home:'botafogo',away:'cruzeiro'},{home:'coritiba',away:'vitoria'},{home:'bahia',away:'corinthians'},{home:'athletico',away:'atleticomg'},{home:'saopaulo',away:'internacional'},{home:'fluminense',away:'santos'},{home:'flamengo',away:'mirassol'},{home:'chapecoense',away:'remo'}],
  [{home:'bragantino',away:'palmeiras'},{home:'botafogo',away:'vasco'},{home:'coritiba',away:'gremio'},{home:'bahia',away:'cruzeiro'},{home:'athletico',away:'vitoria'},{home:'saopaulo',away:'corinthians'},{home:'fluminense',away:'atleticomg'},{home:'flamengo',away:'internacional'},{home:'chapecoense',away:'santos'},{home:'remo',away:'mirassol'}],
  [{home:'botafogo',away:'palmeiras'},{home:'coritiba',away:'bragantino'},{home:'bahia',away:'vasco'},{home:'athletico',away:'gremio'},{home:'saopaulo',away:'cruzeiro'},{home:'fluminense',away:'vitoria'},{home:'flamengo',away:'corinthians'},{home:'chapecoense',away:'atleticomg'},{home:'remo',away:'internacional'},{home:'mirassol',away:'santos'}],
  [{home:'coritiba',away:'palmeiras'},{home:'bahia',away:'botafogo'},{home:'athletico',away:'bragantino'},{home:'saopaulo',away:'vasco'},{home:'fluminense',away:'gremio'},{home:'flamengo',away:'cruzeiro'},{home:'chapecoense',away:'vitoria'},{home:'remo',away:'corinthians'},{home:'mirassol',away:'atleticomg'},{home:'santos',away:'internacional'}],
  [{home:'bahia',away:'palmeiras'},{home:'athletico',away:'coritiba'},{home:'saopaulo',away:'botafogo'},{home:'fluminense',away:'bragantino'},{home:'flamengo',away:'vasco'},{home:'chapecoense',away:'gremio'},{home:'remo',away:'cruzeiro'},{home:'mirassol',away:'vitoria'},{home:'santos',away:'corinthians'},{home:'internacional',away:'atleticomg'}],
  [{home:'athletico',away:'palmeiras'},{home:'saopaulo',away:'bahia'},{home:'fluminense',away:'coritiba'},{home:'flamengo',away:'botafogo'},{home:'chapecoense',away:'bragantino'},{home:'remo',away:'vasco'},{home:'mirassol',away:'gremio'},{home:'santos',away:'cruzeiro'},{home:'internacional',away:'vitoria'},{home:'atleticomg',away:'corinthians'}],
  [{home:'saopaulo',away:'palmeiras'},{home:'fluminense',away:'athletico'},{home:'flamengo',away:'bahia'},{home:'chapecoense',away:'coritiba'},{home:'remo',away:'botafogo'},{home:'mirassol',away:'bragantino'},{home:'santos',away:'vasco'},{home:'internacional',away:'gremio'},{home:'atleticomg',away:'cruzeiro'},{home:'corinthians',away:'vitoria'}],
  [{home:'fluminense',away:'palmeiras'},{home:'flamengo',away:'saopaulo'},{home:'chapecoense',away:'athletico'},{home:'remo',away:'bahia'},{home:'mirassol',away:'coritiba'},{home:'santos',away:'botafogo'},{home:'internacional',away:'bragantino'},{home:'atleticomg',away:'vasco'},{home:'corinthians',away:'gremio'},{home:'vitoria',away:'cruzeiro'}],
  [{home:'flamengo',away:'palmeiras'},{home:'chapecoense',away:'fluminense'},{home:'remo',away:'saopaulo'},{home:'mirassol',away:'athletico'},{home:'santos',away:'bahia'},{home:'internacional',away:'coritiba'},{home:'atleticomg',away:'botafogo'},{home:'corinthians',away:'bragantino'},{home:'vitoria',away:'vasco'},{home:'cruzeiro',away:'gremio'}],
]

// Get current round number (1-38) based on match weeks since season start
function getCurrentRound(): number {
  // Season started Jan 28, 2026. Each week has 2 match days (Tue+Sat) = 1 round per week approximately
  const seasonStart = new Date('2026-01-28T00:00:00Z').getTime()
  const now = Date.now()
  const weeksSinceStart = Math.floor((now - seasonStart) / (7 * 24 * 60 * 60 * 1000))
  return Math.min(38, Math.max(1, weeksSinceStart + 1))
}

function getCurrentFixtures() {
  const round = getCurrentRound()
  return { fixtures: ALL_FIXTURES[round - 1], round }
}

// Standings data — baseado no Brasileirão 2026 (atualizado rodada 13)
const STANDINGS = [
  {id:'palmeiras',pts:32,j:13,v:10,e:2,d:1,gp:23,gc:10},
  {id:'flamengo',pts:26,j:12,v:8,e:2,d:2,gp:24,gc:10},
  {id:'fluminense',pts:26,j:13,v:8,e:2,d:3,gp:23,gc:16},
  {id:'saopaulo',pts:23,j:13,v:7,e:2,d:4,gp:17,gc:11},
  {id:'athletico',pts:22,j:13,v:7,e:1,d:5,gp:20,gc:15},
  {id:'bahia',pts:21,j:12,v:6,e:3,d:3,gp:17,gc:14},
  {id:'coritiba',pts:19,j:13,v:5,e:4,d:4,gp:15,gc:13},
  {id:'botafogo',pts:17,j:12,v:5,e:2,d:5,gp:24,gc:24},
  {id:'bragantino',pts:17,j:13,v:5,e:2,d:6,gp:15,gc:15},
  {id:'vasco',pts:16,j:13,v:4,e:4,d:5,gp:18,gc:19},
  {id:'gremio',pts:16,j:13,v:4,e:4,d:5,gp:15,gc:16},
  {id:'cruzeiro',pts:16,j:13,v:4,e:4,d:5,gp:17,gc:21},
  {id:'vitoria',pts:15,j:12,v:4,e:3,d:5,gp:12,gc:17},
  {id:'corinthians',pts:15,j:13,v:3,e:6,d:4,gp:9,gc:11},
  {id:'atleticomg',pts:14,j:13,v:4,e:2,d:7,gp:14,gc:19},
  {id:'internacional',pts:14,j:13,v:3,e:5,d:5,gp:12,gc:14},
  {id:'santos',pts:14,j:13,v:3,e:5,d:5,gp:18,gc:21},
  {id:'mirassol',pts:9,j:12,v:2,e:3,d:7,gp:13,gc:18},
  {id:'remo',pts:8,j:13,v:1,e:5,d:7,gp:13,gc:23},
  {id:'chapecoense',pts:8,j:12,v:1,e:5,d:6,gp:12,gc:24},
]

const DRILL_DEFS = [
  {id:'chute',name:'Chute',attr:'attr_prec' as keyof Profile,gain:2,limit:3,emoji:'⚽'},
  {id:'fisico',name:'Físico',attr:'attr_stam' as keyof Profile,gain:3,limit:3,emoji:'🏃'},
  {id:'tatico',name:'Tático',attr:'attr_forca' as keyof Profile,gain:2,limit:2,emoji:'🧠'},
  {id:'falta',name:'Falta',attr:'attr_refl' as keyof Profile,gain:2,limit:2,emoji:'🎯'},
  {id:'livre',name:'Livre',attr:'attr_forca' as keyof Profile,gain:1,limit:5,emoji:'⭐'},
]

// max attr: 99. Base: 50 pra todos. Drills sobem. Descrição:
// forca max 99 = chutes mais fortes (mais gols)
// prec max 99 = 95% de chance de acerto
// stam max 99 = cooldown reduzido
// refl max 99 = barra de drill mais lenta (mais fácil)

const SHOP_ITEMS = [
  // Chuteiras
  {id:'boot_bronze',cat:'chuteiras',name:'Chuteira Bronze',icon:'👟',desc:'+2% chance de acerto',effect:'prec',value:2,price:50000,vip:0},
  {id:'boot_prata',cat:'chuteiras',name:'Chuteira Prata',icon:'👟',desc:'+4% chance de acerto',effect:'prec',value:4,price:120000,vip:0},
  {id:'boot_ouro',cat:'chuteiras',name:'Chuteira Ouro',icon:'👟',desc:'+6% chance de acerto',effect:'prec',value:6,price:280000,vip:0},
  {id:'boot_platina',cat:'chuteiras',name:'Chuteira Platina',icon:'👟',desc:'+8% chance de acerto',effect:'prec',value:8,price:550000,vip:0},
  {id:'boot_diamante',cat:'chuteiras',name:'Chuteira Diamante',icon:'💎',desc:'+10% chance de acerto',effect:'prec',value:10,price:900000,vip:0},
  {id:'boot_lendaria',cat:'chuteiras',name:'Chuteira Lendária',icon:'🔥',desc:'+10% acerto + bônus de renda',effect:'prec',value:10,price:0,vip:30},
  // Itens especiais
  {id:'energetico',cat:'itens',name:'Energético',icon:'⚡',desc:'Zera todos os cooldowns agora',effect:'cooldown',value:0,price:80000,vip:0},
  {id:'gel_cabelo',cat:'itens',name:'Gel Mágico',icon:'💈',desc:'+5 reflexo permanente',effect:'attr_refl',value:5,price:120000,vip:0},
  {id:'luvas_midas',cat:'itens',name:'Luvas de Midas',icon:'🧤',desc:'Próximos 10 chutes são gols garantidos',effect:'golden',value:10,price:0,vip:5},
  {id:'escudo',cat:'itens',name:'Escudo Tático',icon:'🛡️',desc:'Adversário não marca por 15 min',effect:'shield',value:900,price:0,vip:3},
  {id:'vitamina',cat:'itens',name:'Vitamina C',icon:'🍊',desc:'+3 stamina permanente',effect:'attr_stam',value:3,price:60000,vip:0},
  {id:'canguru',cat:'itens',name:'Tênis Canguru',icon:'🦘',desc:'-30% cooldown no escanteio',effect:'cd_esc',value:30,price:150000,vip:0},
  // Clube
  {id:'estadio1',cat:'clube',name:'Estádio N1',icon:'🏟️',desc:'+10% renda por jogo',effect:'renda',value:10,price:200000,vip:0},
  {id:'estadio2',cat:'clube',name:'Estádio N2',icon:'🏟️',desc:'+20% renda por jogo',effect:'renda',value:20,price:450000,vip:0},
  {id:'estadio3',cat:'clube',name:'Estádio N3',icon:'🏟️',desc:'+35% renda por jogo',effect:'renda',value:35,price:900000,vip:0},
  {id:'gramado_dark',cat:'clube',name:'Gramado Dark',icon:'🌑',desc:'5% nerf no adversário',effect:'nerf',value:5,price:300000,vip:0},
  {id:'narrador_lenda',cat:'clube',name:'Narrador Lenda',icon:'🎙️',desc:'Feed com narrações épicas',effect:'narrator',value:1,price:0,vip:2},
  {id:'uniforme_pro',cat:'clube',name:'Uniforme Pro',icon:'👕',desc:'+3 força permanente',effect:'attr_forca',value:3,price:180000,vip:0},
]

const SHOOT_MSGS = {
  hit: ['GOOOL! 🔥','Que golaço!','No fundo das redes!','Que chute incrível!','Goleiro não chegou!','Arrasa, arrasa!'],
  miss: ['Errou! 😬','Bateu na trave.','Goleiro defendeu!','Fora! Desperdiçou.','Que pena!'],
}

function fmtTimer(s: number) {
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60
  return `${h>0?h+':':''}${m<10&&h>0?'0':''}${m}:${sec<10?'0':''}${sec}`
}
function pick(arr: string[]) { return arr[Math.floor(Math.random()*arr.length)] }

function getLondonMatchStatus() {
  const now = new Date()
  const londonOffset = isDST(now) ? 1 : 0
  const londonNow = new Date(now.getTime() + londonOffset * 3600000)
  const londonDay = londonNow.getUTCDay()   // 0=Sun,1=Mon,2=Tue,...,6=Sat
  const londonHour = londonNow.getUTCHours()
  const londonMin = londonNow.getUTCMinutes()
  const londonSec = londonNow.getUTCSeconds()
  const matchDays = [2, 6] // Tue, Sat
  const MATCH_HOUR = 23    // 23:00 London = 19:00 Brasilia

  // Is a match running right now? (match day + between 23:00 and 00:30)
  const minutesSinceMidnight = londonHour * 60 + londonMin
  const matchStart = MATCH_HOUR * 60
  const matchEnd = matchStart + 90 // 90 minutes
  const isMatchDay = matchDays.includes(londonDay)
  const isMatchTime = isMatchDay && minutesSinceMidnight >= matchStart && minutesSinceMidnight < matchEnd

  // Seconds elapsed since match started (for auto-start timer sync)
  const elapsedSecs = isMatchTime ? (minutesSinceMidnight - matchStart) * 60 + londonSec : 0

  // Seconds until next match
  let secsUntil = 0
  if (!isMatchTime) {
    let found = false
    for (let i = 0; i < 8 && !found; i++) {
      const checkDay = (londonDay + i) % 7
      if (matchDays.includes(checkDay)) {
        if (i === 0 && minutesSinceMidnight >= matchEnd) continue
        if (i === 0 && minutesSinceMidnight < matchStart) {
          secsUntil = (matchStart - minutesSinceMidnight) * 60 - londonSec
        } else {
          const minsToday = i === 0 ? 0 : (24 * 60 - minutesSinceMidnight)
          const minsFromMidnight = i === 0 ? 0 : (i - 1) * 24 * 60
          secsUntil = minsToday * 60 + minsFromMidnight * 60 + matchStart * 60 - londonSec
          if (i > 0) secsUntil = ((24 * i - (londonHour * 60 + londonMin) / 60) * 3600) + (MATCH_HOUR * 3600) - londonSec
        }
        found = true
      }
    }
  }

  const labels = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
  let label = 'Em breve'
  if (isMatchTime) label = 'AO VIVO'
  else {
    for (let i = 0; i < 8; i++) {
      const checkDay = (londonDay + i) % 7
      if (matchDays.includes(checkDay)) {
        if (i === 0 && minutesSinceMidnight >= matchEnd) continue
        label = i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : labels[checkDay]
        break
      }
    }
  }

  return { isMatchTime, elapsedSecs, secsUntil, label, londonHour, londonMin }
}

function getNextMatchInfo() {
  const s = getLondonMatchStatus()
  return { label: s.label }
}

function isDST(date: Date) {
  const jan = new Date(date.getFullYear(), 0, 1).getTimezoneOffset()
  const jul = new Date(date.getFullYear(), 6, 1).getTimezoneOffset()
  return Math.max(jan, jul) !== date.getTimezoneOffset()
}

function MiniShirt({ primary, secondary, size = 36 }: { primary: string; secondary: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 4 L6 10 L10 11 L10 28 L26 28 L26 11 L30 10 L26 4 L22 6 Q18 8 14 6 Z" fill={primary} stroke={secondary} strokeWidth="1.5"/>
      <path d="M14 6 Q18 8 22 6 L22 10 Q18 12 14 10 Z" fill={secondary}/>
    </svg>
  )
}

function PenaltiAnim() {
  const gkRef = useRef<SVGGElement>(null)
  useEffect(() => {
    let x = 0, dir = 1
    const iv = setInterval(() => {
      x += dir*0.9; if(x>13)dir=-1; if(x<-13)dir=1
      gkRef.current?.setAttribute('transform',`translate(${x.toFixed(1)},0)`)
    }, 55)
    return () => clearInterval(iv)
  }, [])
  return (
    <svg width="100%" height="100%" viewBox="0 0 120 80">
      <rect width="120" height="80" fill="#0A1A10"/>
      <rect x="0" y="68" width="120" height="12" fill="#0D2015"/>
      <line x1="38" y1="4" x2="92" y2="4" stroke="#00D68F" strokeWidth="1.5" opacity=".5"/>
      <line x1="38" y1="4" x2="38" y2="26" stroke="#00D68F" strokeWidth="1.5" opacity=".5"/>
      <line x1="92" y1="4" x2="92" y2="26" stroke="#00D68F" strokeWidth="1.5" opacity=".5"/>
      <line x1="38" y1="26" x2="92" y2="26" stroke="#00D68F" strokeWidth="1.5" opacity=".5"/>
      <g ref={gkRef}>
        <circle cx="65" cy="14" r="5" fill="#3B82F6"/>
        <line x1="65" y1="19" x2="65" y2="32" stroke="#3B82F6" strokeWidth="2"/>
        <line x1="54" y1="24" x2="76" y2="24" stroke="#3B82F6" strokeWidth="2.5"/>
        <line x1="65" y1="32" x2="58" y2="42" stroke="#3B82F6" strokeWidth="2"/>
        <line x1="65" y1="32" x2="72" y2="42" stroke="#3B82F6" strokeWidth="2"/>
      </g>
      <circle cx="65" cy="60" r="5" fill="#00D68F"/>
      <line x1="65" y1="65" x2="65" y2="75" stroke="#00D68F" strokeWidth="2"/>
      <line x1="58" y1="68" x2="72" y2="68" stroke="#00D68F" strokeWidth="2"/>
      <circle cx="65" cy="52" r="4.5" fill="#FFB830"/>
    </svg>
  )
}

function FaltaAnim() {
  const ballRef = useRef<SVGCircleElement>(null)
  useEffect(() => {
    let t = 0
    const iv = setInterval(() => {
      t += 0.05; if(t>1.2)t=0
      const x = 28 + t*75
      const y = 58 - Math.sin(t/1.2*Math.PI)*36
      ballRef.current?.setAttribute('cx',x.toFixed(1))
      ballRef.current?.setAttribute('cy',y.toFixed(1))
    }, 28)
    return () => clearInterval(iv)
  }, [])
  return (
    <svg width="100%" height="100%" viewBox="0 0 120 80">
      <rect width="120" height="80" fill="#0A1A10"/>
      <rect x="0" y="68" width="120" height="12" fill="#0D2015"/>
      <line x1="70" y1="4" x2="110" y2="4" stroke="#00D68F" strokeWidth="1.5" opacity=".5"/>
      <line x1="70" y1="4" x2="70" y2="24" stroke="#00D68F" strokeWidth="1.5" opacity=".5"/>
      <line x1="110" y1="4" x2="110" y2="24" stroke="#00D68F" strokeWidth="1.5" opacity=".5"/>
      <line x1="70" y1="24" x2="110" y2="24" stroke="#00D68F" strokeWidth="1.5" opacity=".5"/>
      <circle cx="75" cy="18" r="4" fill="#3B82F6"/>
      <circle cx="84" cy="16" r="4" fill="#3B82F6"/>
      <circle cx="93" cy="18" r="4" fill="#3B82F6"/>
      <circle cx="18" cy="52" r="5" fill="#00D68F"/>
      <line x1="18" y1="57" x2="18" y2="68" stroke="#00D68F" strokeWidth="2"/>
      <line x1="11" y1="61" x2="28" y2="61" stroke="#00D68F" strokeWidth="2"/>
      <circle ref={ballRef} cx="28" cy="58" r="4" fill="#FFB830"/>
    </svg>
  )
}

function DribleAnim() {
  const plRef = useRef<SVGGElement>(null)
  const ballRef = useRef<SVGCircleElement>(null)
  useEffect(() => {
    let x = 14, going = true
    const iv = setInterval(() => {
      x += going ? 1.1 : -1.1
      if(x>58)going=false; if(x<14)going=true
      const bob = Math.sin(x*0.3)*2
      plRef.current?.setAttribute('transform',`translate(${x-14},${bob.toFixed(1)})`)
      ballRef.current?.setAttribute('cx',(x+9).toFixed(1))
      ballRef.current?.setAttribute('cy',(50+bob).toFixed(1))
    }, 28)
    return () => clearInterval(iv)
  }, [])
  return (
    <svg width="100%" height="100%" viewBox="0 0 120 80">
      <rect width="120" height="80" fill="#0A1A10"/>
      <rect x="0" y="68" width="120" height="12" fill="#0D2015"/>
      <circle cx="74" cy="38" r="5" fill="#3B82F6"/>
      <line x1="74" y1="43" x2="74" y2="54" stroke="#3B82F6" strokeWidth="2"/>
      <line x1="67" y1="47" x2="81" y2="47" stroke="#3B82F6" strokeWidth="2"/>
      <line x1="74" y1="54" x2="67" y2="64" stroke="#3B82F6" strokeWidth="2"/>
      <line x1="74" y1="54" x2="81" y2="64" stroke="#3B82F6" strokeWidth="2"/>
      <circle cx="50" cy="42" r="1.5" fill="#FFB830" opacity=".5"/>
      <circle cx="60" cy="34" r="1.5" fill="#FFB830" opacity=".5"/>
      <g ref={plRef}>
        <circle cx="14" cy="38" r="5" fill="#00D68F"/>
        <line x1="14" y1="43" x2="14" y2="54" stroke="#00D68F" strokeWidth="2"/>
        <line x1="7" y1="47" x2="21" y2="47" stroke="#00D68F" strokeWidth="2"/>
        <line x1="14" y1="54" x2="7" y2="64" stroke="#00D68F" strokeWidth="2"/>
        <line x1="14" y1="54" x2="21" y2="64" stroke="#00D68F" strokeWidth="2"/>
      </g>
      <circle ref={ballRef} cx="23" cy="50" r="4" fill="#FFB830"/>
    </svg>
  )
}

function EscanteioAnim() {
  const jmpRef = useRef<SVGGElement>(null)
  const ballRef = useRef<SVGCircleElement>(null)
  useEffect(() => {
    let t = 0
    const iv = setInterval(() => {
      t += 0.04; const phase = t % 1.6
      const bx = 12 + phase*62, by = 64 - Math.sin(phase/1.6*Math.PI)*44
      ballRef.current?.setAttribute('cx',bx.toFixed(1))
      ballRef.current?.setAttribute('cy',by.toFixed(1))
      const jy = -Math.abs(Math.sin(t*2.2))*10
      jmpRef.current?.setAttribute('transform',`translate(0,${jy.toFixed(1)})`)
    }, 28)
    return () => clearInterval(iv)
  }, [])
  return (
    <svg width="100%" height="100%" viewBox="0 0 120 80">
      <rect width="120" height="80" fill="#0A1A10"/>
      <rect x="0" y="68" width="120" height="12" fill="#0D2015"/>
      <line x1="60" y1="4" x2="105" y2="4" stroke="#00D68F" strokeWidth="1.5" opacity=".5"/>
      <line x1="60" y1="4" x2="60" y2="26" stroke="#00D68F" strokeWidth="1.5" opacity=".5"/>
      <line x1="105" y1="4" x2="105" y2="26" stroke="#00D68F" strokeWidth="1.5" opacity=".5"/>
      <line x1="60" y1="26" x2="105" y2="26" stroke="#00D68F" strokeWidth="1.5" opacity=".5"/>
      <g ref={jmpRef}>
        <circle cx="82" cy="22" r="5" fill="#00D68F"/>
        <line x1="82" y1="27" x2="82" y2="38" stroke="#00D68F" strokeWidth="2"/>
        <line x1="75" y1="31" x2="89" y2="31" stroke="#00D68F" strokeWidth="2"/>
        <line x1="82" y1="38" x2="75" y2="48" stroke="#00D68F" strokeWidth="2"/>
        <line x1="82" y1="38" x2="89" y2="48" stroke="#00D68F" strokeWidth="2"/>
      </g>
      <circle cx="10" cy="58" r="5" fill="#00D68F"/>
      <line x1="10" y1="63" x2="10" y2="73" stroke="#00D68F" strokeWidth="2"/>
      <line x1="3" y1="66" x2="17" y2="66" stroke="#00D68F" strokeWidth="2"/>
      <circle ref={ballRef} cx="12" cy="64" r="4" fill="#FFB830"/>
    </svg>
  )
}

export default function FutmApp() {
  const [authMode, setAuthMode] = useState<'login'|'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [selectedTeam, setSelectedTeam] = useState('')
  const [authErr, setAuthErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  const [profile, setProfile] = useState<Profile|null>(null)
  const [page, setPage] = useState<Page>('home')
  const [notifMsg, setNotifMsg] = useState('')
  const [rankTab, setRankTab] = useState<'hora'|'rodada'|'temp'>('hora')
  const [shopTab, setShopTab] = useState<'chuteiras'|'itens'|'clube'>('chuteiras')
  const [matchRunning, setMatchRunning] = useState(false)
  const [matchTime, setMatchTime] = useState(5400)
  const [matchPhase, setMatchPhase] = useState('Aguardando início')
  const [scoreH, setScoreH] = useState(0)
  const [scoreA, setScoreA] = useState(0)
  const [acertos, setAcertos] = useState(0)
  const [erros, setErros] = useState(0)
  const [feed, setFeed] = useState<{msg:string,cls:string}[]>([{msg:'Aguardando início...',cls:''}])
  const [cooldowns, setCooldowns] = useState({penalti:0,falta:0,auto:0,escanteio:0})
  const [drillsDone, setDrillsDone] = useState<string[]>([])
  const [activeDrill, setActiveDrill] = useState<typeof DRILL_DEFS[0]|null>(null)
  const [drillRounds, setDrillRounds] = useState(0)
  const [drillScore, setDrillScore] = useState(0)
  const [drillResult, setDrillResult] = useState('')
  const [markerPos, setMarkerPos] = useState(0)
  const [rankList, setRankList] = useState<RankEntry[]>([])
  const [opponent, setOpponent] = useState(TEAMS[1])
  const matchRef = useRef<ReturnType<typeof setInterval>|null>(null)
  const cdRef = useRef({penalti:0,falta:0,auto:0,escanteio:0})
  const markerRef = useRef({pos:0,dir:1,animId:0})
  const profileRef = useRef<Profile|null>(null)

  const notify = useCallback((msg: string) => {
    setNotifMsg(msg); setTimeout(() => setNotifMsg(''), 2600)
  }, [])

  // keep profileRef in sync
  useEffect(() => { profileRef.current = profile }, [profile])

  // Get opponent from fixtures — everyone on same team faces same opponent
  function getOpponentFromFixtures(teamId: string) {
    const { fixtures } = getCurrentFixtures()
    const fixture = fixtures.find(f => f.home === teamId || f.away === teamId)
    if (fixture) {
      const oppId = fixture.home === teamId ? fixture.away : fixture.home
      return TEAMS.find(t => t.id === oppId) || TEAMS[1]
    }
    // fallback if team not in fixtures
    const others = TEAMS.filter(t => t.id !== teamId)
    return others[0]
  }

  async function doLogin() {
    setAuthErr(''); setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setAuthErr('Email ou senha incorretos')
  }

  async function doRegister() {
    setAuthErr('')
    if (!username.trim()||!email.trim()||!password||!selectedTeam) { setAuthErr('Preencha todos os campos'); return }
    const { data: exists } = await supabase.from('profiles').select('id').eq('username',username.trim()).maybeSingle()
    if (exists) { setAuthErr('Usuário já existe'); return }
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password, options:{ data:{ username:username.trim(), team:selectedTeam } } })
    setLoading(false)
    if (error) setAuthErr(error.message)
    else notify('Conta criada! Faça login.')
  }

  async function doLogout() {
    await supabase.auth.signOut()
    setLoggedIn(false); setProfile(null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data:{ session } }) => { if(session?.user) loadProfile(session.user.id) })
    const { data:{ subscription } } = supabase.auth.onAuthStateChange((_e,session) => {
      if(session?.user) loadProfile(session.user.id)
      else { setLoggedIn(false); setProfile(null) }
    })
    return () => subscription.unsubscribe()
  }, [])

  // Auto-start match at scheduled time
  useEffect(() => {
    if (!loggedIn) return
    const checkAndStart = () => {
      const status = getLondonMatchStatus()
      if (status.isMatchTime && !matchRef.current) {
        // Match should be running — start it synced to London time
        const elapsed = status.elapsedSecs
        const remaining = Math.max(0, 5400 - elapsed)
        if (remaining > 0) {
          const p = profileRef.current
          const opp = getOpponentFromFixtures(p?.team || 'palmeiras')
          setOpponent(opp)
          setMatchRunning(true)
          setMatchTime(remaining)
          setMatchPhase(elapsed < 2700 ? '1º Tempo' : elapsed < 3000 ? 'Intervalo' : '2º Tempo')
          setFeed([{msg:'⚽ Partida em andamento! Você entrou no jogo.',cls:'f'}])
          cdRef.current = {penalti:0,falta:0,auto:0,escanteio:0}
          setCooldowns({penalti:0,falta:0,auto:0,escanteio:0})
          matchRef.current = setInterval(tickMatch, 1000)
        }
      }
    }
    checkAndStart()
    // check every 30s in case user opens app during match
    const iv = setInterval(checkAndStart, 30000)
    return () => clearInterval(iv)
  }, [loggedIn])

  async function loadProfile(userId: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id',userId).single()
    if (data) {
      setProfile(data as Profile)
      setDrillsDone(data.drills_done||[])
      setLoggedIn(true)
      setOpponent(getOpponentFromFixtures(data.team || 'palmeiras'))
      loadRanking()
      // Restore match state if there was an active match
      if (data.match_active) {
        setScoreH(data.match_score_h || 0)
        setScoreA(data.match_score_a || 0)
        setAcertos(data.match_acertos || 0)
        setErros(data.match_erros || 0)
      }
    }
  }

  async function saveProfile(updates: Partial<Profile>) {
    const p = profileRef.current; if(!p) return
    const { data } = await supabase.from('profiles').update(updates).eq('id',p.id).select().single()
    if (data) { setProfile(data as Profile); profileRef.current = data as Profile }
  }

  async function loadRanking() {
    const { data } = await supabase.from('ranking_season').select('*')
    if (data && data.length > 0) setRankList(data as RankEntry[])
  }

  function startMatch() {
    if (matchRunning) return
    const p = profileRef.current
    const opp = getOpponentFromFixtures(p?.team || 'palmeiras')
    setOpponent(opp)
    setMatchRunning(true); setMatchTime(5400)
    setScoreH(0); setScoreA(0); setAcertos(0); setErros(0)
    setMatchPhase('1º Tempo')
    setFeed([{msg:'Apito inicial! A partida começou.',cls:''}])
    // Reset match state in DB
    const pStart = profileRef.current
    if(pStart) saveProfile({match_score_h:0,match_score_a:0,match_acertos:0,match_erros:0,match_active:true})
    cdRef.current = {penalti:0,falta:0,auto:0,escanteio:0}
    setCooldowns({penalti:0,falta:0,auto:0,escanteio:0})
    if (matchRef.current) clearInterval(matchRef.current)
    matchRef.current = setInterval(tickMatch, 1000)
  }

  const tickMatch = useCallback(() => {
    setMatchTime(prev => {
      const t = prev - 1
      if(t===2700){setMatchPhase('Intervalo');addFeedItem('Intervalo!','f')}
      if(t===2400){setMatchPhase('2º Tempo');addFeedItem('2º Tempo! Ritmo aumentou.','');
        // stamina bonus: reduce cooldowns
        const stam = profileRef.current?.attr_stam||50
        const bonus = Math.floor((stam-50)/10)
        if(bonus>0){
          cdRef.current.penalti=Math.max(0,cdRef.current.penalti-bonus*3)
          cdRef.current.falta=Math.max(0,cdRef.current.falta-bonus*3)
        }
      }
      if(t<=0){
        if(matchRef.current) clearInterval(matchRef.current)
        setMatchRunning(false); setMatchPhase('Fim de jogo')
        setCooldowns({penalti:0,falta:0,auto:0,escanteio:0})
        setScoreH(h=>{ setScoreA(a=>{
          const r=h>a?'Vitória! 🏆':h<a?'Derrota. 😔':'Empate.'
          addFeedItem('Fim! '+r+' Placar: '+h+' × '+a,h>=a?'g':'m')
          // goals already saved per-shot — just save prize and clear match state
          const p = profileRef.current
          if(p) {
            const prize = h>a ? Math.floor(50000*(1+(p.attr_forca-50)/100)) : 10000
            saveProfile({
              money: (p.money||0)+prize,
              match_active: false,
              match_score_h: 0,
              match_score_a: 0,
              match_acertos: 0,
              match_erros: 0,
            }).then(() => loadRanking())
          }
          return a
        }); return h })
        return 0
      }
      if(Math.random()<0.02) setScoreA(a=>{
        addFeedItem('Gol do adversário!','m')
        const p2=profileRef.current
        if(p2) saveProfile({match_score_a:(p2.match_score_a||0)+1, match_active:true})
        return a+1
      })
      cdRef.current={
        penalti:Math.max(0,cdRef.current.penalti-1),
        falta:Math.max(0,cdRef.current.falta-1),
        auto:Math.max(0,cdRef.current.auto-1),
        escanteio:Math.max(0,cdRef.current.escanteio-1),
      }
      setCooldowns({...cdRef.current})
      return t
    })
  }, [])

  function addFeedItem(msg:string,cls:string){ setFeed(prev=>[{msg,cls},...prev].slice(0,20)) }

  async function doShoot(type:'penalti'|'falta'|'auto'|'escanteio') {
    if(!matchRunning||cdRef.current[type]>0) return
    const p = profileRef.current; if(!p) return
    const acc = Math.min(95, p.attr_prec + p.attr_refl*0.05)
    const hit = Math.random()*100 < acc
    // stamina reduces cooldown
    const stamBonus = Math.floor((p.attr_stam-50)/15)
    const baseCds = {penalti:29,falta:44,auto:59,escanteio:89}
    const cd = Math.max(10, baseCds[type] - stamBonus*2)
    cdRef.current[type] = cd
    setCooldowns({...cdRef.current})
    if(hit){
      setAcertos(a=>a+1); setScoreH(h=>h+1)
      addFeedItem(pick(SHOOT_MSGS.hit),'g')
      // save each goal immediately to DB — ranking updates in real time
      const newScoreH = (p.match_score_h || 0) + 1
      const updates = {
        acertos: p.acertos+1,
        goals_today: p.goals_today+1,
        goals_season: p.goals_season+1,
        match_score_h: newScoreH,
        match_acertos: (p.match_acertos || 0) + 1,
        match_active: true,
      }
      await saveProfile(updates)
      loadRanking()
    } else {
      setErros(e=>e+1); addFeedItem(pick(SHOOT_MSGS.miss),'m')
      const p2 = profileRef.current
      if(p2) await saveProfile({ erros:p2.erros+1, match_erros:(p2.match_erros||0)+1, match_active:true })
    }
  }

  // DRILLS
  function openDrill(d: typeof DRILL_DEFS[0]) {
    if (matchRunning) { notify('Não é possível treinar durante uma partida!'); return }
    setActiveDrill(d); setDrillRounds(0); setDrillScore(0); setDrillResult('')
    const refl = profileRef.current?.attr_refl||50
    startMarker(refl)
  }

  function startMarker(refl:number) {
    cancelAnimationFrame(markerRef.current.animId)
    markerRef.current.pos=0; markerRef.current.dir=1
    // higher refl = slower marker = easier
    const speed = Math.max(0.6, 2.2 - (refl-50)*0.02)
    function animate(){
      markerRef.current.pos+=markerRef.current.dir*speed
      if(markerRef.current.pos>=88){markerRef.current.pos=88;markerRef.current.dir=-1}
      if(markerRef.current.pos<=0){markerRef.current.pos=0;markerRef.current.dir=1}
      setMarkerPos(markerRef.current.pos)
      markerRef.current.animId=requestAnimationFrame(animate)
    }
    animate()
  }

  function closeDrill(){ cancelAnimationFrame(markerRef.current.animId); setActiveDrill(null) }

  async function hitTarget() {
    if(drillRounds>=5||!activeDrill) return
    const hit=markerPos>=37&&markerPos<=63
    const near=markerPos>=25&&markerPos<=75
    const pts=hit?2:near?1:0
    const newRounds=drillRounds+1, newScore=drillScore+pts
    setDrillRounds(newRounds); setDrillScore(newScore)
    setDrillResult(hit?'PERFEITO! +2':near?'BOM! +1':'ERROU!')
    if(newRounds>=5){
      cancelAnimationFrame(markerRef.current.animId)
      const gain=Math.max(1,Math.round(newScore*activeDrill.gain*0.5))
      const attrKey=activeDrill.attr
      const p=profileRef.current; if(!p) return
      const newVal=Math.min(99,(p[attrKey] as number)+gain)
      const newDrills=[...drillsDone,activeDrill.id]
      setDrillsDone(newDrills)
      setDrillResult(`CONCLUÍDO! +${gain} ${attrKey.replace('attr_','').toUpperCase()}`)
      notify(`+${gain} ${attrKey.replace('attr_','').toUpperCase()}! Atributo salvo.`)
      const updates:Partial<Profile>={[attrKey]:newVal, drills_done:newDrills}
      setProfile(prev=>prev?{...prev,...updates}:prev)
      await saveProfile(updates)
      setTimeout(()=>setActiveDrill(null),1400)
    }
  }

  // SHOP
  async function buyItem(item: typeof SHOP_ITEMS[0]) {
    const p = profileRef.current; if(!p) return
    if(item.vip>0){ notify(`Requer VIP ${item.vip}`); return }
    if((p.money||0) < item.price){ notify('Saldo insuficiente!'); return }
    const updates:Partial<Profile> = { money:(p.money||0)-item.price }
    // apply permanent attr effects
    if(item.effect==='attr_prec') updates.attr_prec=Math.min(99,p.attr_prec+item.value)
    if(item.effect==='attr_refl') updates.attr_refl=Math.min(99,p.attr_refl+item.value)
    if(item.effect==='attr_stam') updates.attr_stam=Math.min(99,p.attr_stam+item.value)
    if(item.effect==='attr_forca') updates.attr_forca=Math.min(99,p.attr_forca+item.value)
    if(item.effect==='cooldown') { cdRef.current={penalti:0,falta:0,auto:0,escanteio:0}; setCooldowns({penalti:0,falta:0,auto:0,escanteio:0}) }
    setProfile(prev=>prev?{...prev,...updates}:prev)
    await saveProfile(updates)
    notify(`✅ ${item.name} comprado!`)
  }

  const p = profile
  const nextMatch = getNextMatchInfo()
  const playerTeam = TEAMS.find(t=>t.id===p?.team) || TEAMS[0]

  function AttrBar({val,label,max=99}:{val:number,label:string,max?:number}){
    return(
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
        <span style={{fontFamily:'var(--font)',fontSize:11,color:'var(--txt2)',width:72,flexShrink:0,textTransform:'uppercase',letterSpacing:'.5px',fontWeight:600}}>{label}</span>
        <div style={{flex:1,height:6,background:'var(--bg2)',borderRadius:3,overflow:'hidden'}}>
          <div style={{height:'100%',borderRadius:3,background:val>=90?'#FFB830':val>=70?'#00D68F':'#3B82F6',width:`${(val/max)*100}%`,transition:'width .4s'}}/>
        </div>
        <span style={{fontFamily:'var(--font)',fontSize:12,fontWeight:700,width:32,textAlign:'right',color:val>=90?'#FFB830':val>=70?'var(--g)':'#60A5FA'}}>{val}/99</span>
      </div>
    )
  }

  function Btn({children,primary,onClick,disabled,style}:any){
    return(
      <button onClick={onClick} disabled={disabled} style={{
        display:'inline-flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:8,
        fontSize:12,cursor:disabled?'not-allowed':'pointer',
        border:`1px solid ${primary?'var(--g)':'var(--border2)'}`,
        background:primary?'var(--g)':'var(--card2)',color:primary?'#000':'var(--txt)',
        fontFamily:'var(--font)',fontWeight:700,letterSpacing:'.5px',textTransform:'uppercase',
        opacity:disabled?.35:1,transition:'all .13s',...style
      }}>{children}</button>
    )
  }

  function Card({children,style}:{children:React.ReactNode,style?:React.CSSProperties}){
    return <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:12,padding:16,marginBottom:12,...style}}>{children}</div>
  }

  function CardTitle({children}:{children:React.ReactNode}){
    return <div style={{fontFamily:'var(--font)',fontSize:11,fontWeight:700,color:'var(--txt2)',marginBottom:12,letterSpacing:1,textTransform:'uppercase'}}>{children}</div>
  }

  function Badge({children,variant='g'}:{children:React.ReactNode,variant?:'g'|'r'|'a'|'gr'}){
    const s:Record<string,React.CSSProperties>={
      g:{background:'rgba(0,214,143,.15)',color:'var(--g)',border:'1px solid rgba(0,214,143,.3)'},
      r:{background:'rgba(255,71,87,.15)',color:'var(--red)',border:'1px solid rgba(255,71,87,.3)'},
      a:{background:'rgba(255,184,48,.15)',color:'var(--amber)',border:'1px solid rgba(255,184,48,.3)'},
      gr:{background:'var(--bg2)',color:'var(--txt2)',border:'1px solid var(--border)'},
    }
    return <span style={{display:'inline-block',fontSize:10,padding:'2px 8px',borderRadius:20,fontWeight:700,fontFamily:'var(--font)',letterSpacing:'.5px',textTransform:'uppercase',...s[variant]}}>{children}</span>
  }


  const navItems:[Page,string,string][]=[
    ['home','ti-home','Início'],['match','ti-ball-football','Partida'],['drills','ti-run','Drills'],
    ['ranking','ti-trophy','Ranking'],['standings','ti-table','Tabela'],['jogos','ti-calendar-event','Jogos'],['shop','ti-shopping-bag','Loja'],['calendar','ti-calendar','Calendário'],['profile','ti-user','Perfil'],
  ]

  return !loggedIn ? (
    <>
    <div style={{position:'fixed',inset:0,background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center',
      backgroundImage:'radial-gradient(ellipse at 20% 50%,rgba(0,214,143,.06) 0%,transparent 60%)'}}>
      <div style={{width:380,background:'var(--card)',border:'1px solid var(--border2)',borderRadius:16,padding:32,position:'relative',overflow:'hidden',maxHeight:'92vh',overflowY:'auto'}}>
        <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,transparent,var(--g),transparent)'}}/>
        <div style={{fontFamily:'var(--font)',fontSize:34,fontWeight:800,textAlign:'center',marginBottom:4,letterSpacing:2,textTransform:'uppercase'}}>
          FU<span style={{color:'var(--g)'}}>TM</span>
        </div>
        <div style={{fontSize:12,color:'var(--txt2)',textAlign:'center',marginBottom:22,letterSpacing:'.5px',textTransform:'uppercase'}}>O jogo de futebol online</div>
        <div style={{display:'flex',gap:2,background:'var(--bg2)',padding:3,borderRadius:8,marginBottom:18,border:'1px solid var(--border)'}}>
          {(['login','register'] as const).map(t=>(
            <div key={t} onClick={()=>{setAuthMode(t);setAuthErr('')}}
              style={{flex:1,textAlign:'center',padding:7,fontSize:12,cursor:'pointer',borderRadius:6,
                background:authMode===t?'var(--g)':'transparent',color:authMode===t?'#000':'var(--txt2)',
                fontFamily:'var(--font)',fontWeight:700,letterSpacing:'.5px',textTransform:'uppercase',transition:'all .13s'}}>
              {t==='login'?'Entrar':'Cadastrar'}
            </div>
          ))}
        </div>
        {authMode==='login'?(
          <>
            {[{label:'Email',val:email,set:setEmail,ph:'seu@email.com'},{label:'Senha',val:password,set:setPassword,ph:'••••••',type:'password'}].map(f=>(
              <div key={f.label} style={{marginBottom:12}}>
                <label style={{fontSize:10,color:'var(--txt2)',display:'block',marginBottom:5,letterSpacing:'.8px',textTransform:'uppercase',fontFamily:'var(--font)',fontWeight:600}}>{f.label}</label>
                <input type={(f as any).type||'text'} value={f.val} onChange={e=>f.set(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doLogin()} placeholder={f.ph}
                  style={{width:'100%',padding:'10px 12px',borderRadius:8,border:'1px solid var(--border)',background:'var(--bg2)',color:'var(--txt)',fontSize:14,outline:'none'}}/>
              </div>
            ))}
          </>
        ):(
          <>
            {[{label:'Usuário',val:username,set:setUsername,ph:'seu nick'},{label:'Email',val:email,set:setEmail,ph:'seu@email.com'},{label:'Senha',val:password,set:setPassword,ph:'••••••',type:'password'}].map(f=>(
              <div key={f.label} style={{marginBottom:12}}>
                <label style={{fontSize:10,color:'var(--txt2)',display:'block',marginBottom:5,letterSpacing:'.8px',textTransform:'uppercase',fontFamily:'var(--font)',fontWeight:600}}>{f.label}</label>
                <input type={(f as any).type||'text'} value={f.val} onChange={e=>f.set(e.target.value)} placeholder={f.ph}
                  style={{width:'100%',padding:'10px 12px',borderRadius:8,border:'1px solid var(--border)',background:'var(--bg2)',color:'var(--txt)',fontSize:14,outline:'none'}}/>
              </div>
            ))}
            <div style={{marginBottom:14}}>
              <label style={{fontSize:10,color:'var(--txt2)',display:'block',marginBottom:8,letterSpacing:'.8px',textTransform:'uppercase',fontFamily:'var(--font)',fontWeight:600}}>Seu time</label>
              <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:5,maxHeight:180,overflowY:'auto'}}>
                {TEAMS.map(t=>(
                  <div key={t.id} onClick={()=>setSelectedTeam(t.id)}
                    style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'6px 2px',borderRadius:8,cursor:'pointer',
                      border:`1px solid ${selectedTeam===t.id?'var(--g)':'var(--border)'}`,
                      background:selectedTeam===t.id?'rgba(0,214,143,.1)':'var(--bg2)',transition:'all .12s'}}>
                    <MiniShirt primary={t.primary} secondary={t.secondary} size={26}/>
                    <span style={{fontFamily:'var(--font)',fontSize:8,fontWeight:700,textAlign:'center',color:selectedTeam===t.id?'var(--g)':'var(--txt2)'}}>{t.abbr}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
        {authErr&&<div style={{fontSize:12,color:'var(--red)',marginBottom:8,textAlign:'center'}}>{authErr}</div>}
        <Btn primary onClick={authMode==='login'?doLogin:doRegister} disabled={loading} style={{width:'100%',justifyContent:'center'}}>
          {loading?'...':authMode==='login'?'Entrar':'Criar conta'}
        </Btn>
        <div style={{marginTop:12,fontSize:11,color:'var(--txt3)',textAlign:'center'}}>
          {authMode==='login'?'Não tem conta? ':'Já tem conta? '}
          <span onClick={()=>{setAuthMode(authMode==='login'?'register':'login');setAuthErr('')}} style={{color:'var(--g)',cursor:'pointer'}}>
            {authMode==='login'?'Cadastre-se':'Entrar'}
          </span>
        </div>
      </div>
    </div>
    </>
  ) : (
    <>
    <div style={{display:'flex',height:'100vh',minHeight:600}}>
      <div style={{width:200,flexShrink:0,background:'var(--bg2)',borderRight:'1px solid var(--border)',display:'flex',flexDirection:'column'}}>
        <div style={{padding:'20px 16px 14px',fontFamily:'var(--font)',fontSize:22,fontWeight:800,letterSpacing:2,textTransform:'uppercase',borderBottom:'1px solid var(--border)'}}>
          FU<span style={{color:'var(--g)'}}>TM</span> <span style={{fontSize:10,color:'var(--txt3)',fontWeight:400}}>1.0</span>
        </div>
        <div style={{padding:'10px 0'}}>
          {navItems.map(([id,icon,label])=>(
            <div key={id} onClick={()=>{setPage(id);if(id==='ranking')loadRanking()}}
              style={{display:'flex',alignItems:'center',gap:10,padding:'9px 16px',fontSize:13,
                color:page===id?'var(--g)':'var(--txt2)',cursor:'pointer',
                background:page===id?'var(--card)':'transparent',
                fontFamily:'var(--font)',fontWeight:500,letterSpacing:'.3px',textTransform:'uppercase',
                borderLeft:page===id?'2px solid var(--g)':'2px solid transparent',transition:'all .12s'}}>
              <i className={`ti ${icon}`}/>{label}
            </div>
          ))}
        </div>
        <div style={{padding:'14px 16px',borderTop:'1px solid var(--border)',marginTop:'auto'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
            <MiniShirt primary={playerTeam.primary} secondary={playerTeam.secondary} size={28}/>
            <div>
              <div style={{fontFamily:'var(--font)',fontSize:13,fontWeight:700,letterSpacing:'.5px',textTransform:'uppercase'}}>{p?.username}</div>
              <div style={{fontSize:10,color:'var(--g)',marginTop:1}}>{playerTeam.name}</div>
            </div>
          </div>
          <button onClick={doLogout} style={{display:'flex',alignItems:'center',gap:6,padding:'5px 10px',borderRadius:8,fontSize:11,cursor:'pointer',border:'1px solid var(--border2)',background:'var(--card2)',color:'var(--txt2)',fontFamily:'var(--font)',fontWeight:600,letterSpacing:'.5px',textTransform:'uppercase'}}>
            <i className="ti ti-logout"/> Sair
          </button>
        </div>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:20,background:'var(--bg)'}}>

        {/* HOME */}
        {page==='home'&&(
          <div>
            <div style={{fontFamily:'var(--font)',fontSize:24,fontWeight:800,letterSpacing:1,textTransform:'uppercase',marginBottom:16}}>Início</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:12}}>
              {[
                {lbl:'Gols hoje',val:p?.goals_today||0,c:'var(--g)'},
                {lbl:'Temporada',val:p?.goals_season||0,c:'var(--txt)'},
                {lbl:'Saldo',val:`R$${Math.floor((p?.money||0)/1000)}k`,c:'var(--txt)'},
                {lbl:'Próx. partida',val:nextMatch.label,c:nextMatch.label==='AO VIVO'?'var(--g)':'var(--amber)'},
              ].map(s=>(
                <div key={s.lbl} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:10,padding:12}}>
                  <div style={{fontFamily:'var(--font)',fontSize:9,color:'var(--txt2)',letterSpacing:'.8px',textTransform:'uppercase',marginBottom:4}}>{s.lbl}</div>
                  <div style={{fontFamily:'var(--font)',fontSize:22,fontWeight:800,color:s.c}}>{s.val}</div>
                </div>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <Card>
                <CardTitle>Missões ativas</CardTitle>
                {[
                  {label:'50 gols na rodada',cur:p?.goals_today||0,max:50},
                  {label:'5 drills esta semana',cur:drillsDone.length,max:5},
                  {label:'Vencer 1 desafio',cur:0,max:1},
                ].map(m=>(
                  <div key={m.label} style={{marginBottom:10}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}>
                      <span>{m.label}</span><span style={{color:'var(--txt2)'}}>{Math.min(m.cur,m.max)}/{m.max}</span>
                    </div>
                    <div style={{height:5,background:'var(--bg2)',borderRadius:3,overflow:'hidden'}}>
                      <div style={{height:'100%',borderRadius:3,background:'var(--g)',width:`${Math.min(100,Math.round(m.cur/m.max*100))}%`,transition:'width .3s'}}/>
                    </div>
                  </div>
                ))}
              </Card>
              <Card>
                <CardTitle>Atributos (máx 99)</CardTitle>
                <AttrBar val={p?.attr_forca||50} label="Força"/>
                <AttrBar val={p?.attr_prec||50} label="Precisão"/>
                <AttrBar val={p?.attr_stam||50} label="Stamina"/>
                <AttrBar val={p?.attr_refl||50} label="Reflexo"/>
                <div style={{fontSize:10,color:'var(--txt3)',marginTop:4}}>Suba via drills e itens da loja</div>
              </Card>
            </div>
          </div>
        )}

        {/* MATCH */}
        {page==='match'&&(
          <div>
            <div style={{fontFamily:'var(--font)',fontSize:24,fontWeight:800,letterSpacing:1,textTransform:'uppercase',marginBottom:16}}>Partida ao vivo</div>
            <Card>
              <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginBottom:8}}>
                <div style={{width:7,height:7,borderRadius:'50%',background:matchRunning?'var(--g)':'var(--txt3)',animation:matchRunning?'pulse 1.5s infinite':'none'}}/>
                <span style={{fontFamily:'var(--font)',fontSize:12,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:matchRunning?'var(--g)':'var(--txt2)'}}>{matchPhase}</span>
                <span style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:8,padding:'5px 12px',fontFamily:'var(--font)',fontSize:14,fontWeight:700,fontVariantNumeric:'tabular-nums',letterSpacing:1}}>{fmtTimer(matchTime)}</span>
              </div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:24,padding:'16px',textAlign:'center'}}>
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,flex:1}}>
                  <MiniShirt primary={playerTeam.primary} secondary={playerTeam.secondary} size={48}/>
                  <div style={{fontFamily:'var(--font)',fontSize:12,fontWeight:700,letterSpacing:'.5px',textTransform:'uppercase'}}>{playerTeam.name}</div>
                  <div style={{fontFamily:'var(--font)',fontSize:48,fontWeight:800,lineHeight:1,letterSpacing:2,color:'var(--g)'}}>{scoreH}</div>
                </div>
                <div style={{fontFamily:'var(--font)',fontSize:13,color:'var(--txt3)',fontWeight:700,letterSpacing:2}}>VS</div>
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,flex:1}}>
                  <MiniShirt primary={opponent.primary} secondary={opponent.secondary} size={48}/>
                  <div style={{fontFamily:'var(--font)',fontSize:12,fontWeight:700,letterSpacing:'.5px',textTransform:'uppercase'}}>{opponent.name}</div>
                  <div style={{fontFamily:'var(--font)',fontSize:48,fontWeight:800,lineHeight:1,letterSpacing:2,color:'var(--red)'}}>{scoreA}</div>
                </div>
              </div>
              <div style={{height:1,background:'var(--border)',margin:'10px 0'}}/>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                <span style={{fontFamily:'var(--font)',fontSize:11,color:'var(--txt2)',letterSpacing:'.5px',textTransform:'uppercase'}}>Suas ações</span>
                <div style={{display:'flex',gap:6}}>
                  <Badge variant="g">{acertos} acertos</Badge>
                  <Badge variant="r">{erros} erros</Badge>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:10}}>
                {([
                  {type:'penalti' as const,label:'Pênalti',Anim:PenaltiAnim},
                  {type:'falta' as const,label:'Falta',Anim:FaltaAnim},
                  {type:'auto' as const,label:'Drible',Anim:DribleAnim},
                  {type:'escanteio' as const,label:'Escanteio',Anim:EscanteioAnim},
                ]).map(({type,label,Anim})=>{
                  const cd=cooldowns[type], disabled=!matchRunning||cd>0
                  return(
                    <button key={type} onClick={()=>doShoot(type)} disabled={disabled}
                      style={{padding:0,borderRadius:10,cursor:disabled?'not-allowed':'pointer',
                        border:`1px solid ${!disabled?'var(--g)':'var(--border)'}`,
                        background:'var(--bg2)',color:'var(--txt)',
                        display:'flex',flexDirection:'column',alignItems:'center',overflow:'hidden',
                        opacity:disabled?.35:1,transition:'border-color .15s'}}>
                      <div style={{width:'100%',height:80,pointerEvents:'none'}}><Anim/></div>
                      <span style={{fontFamily:'var(--font)',fontSize:13,fontWeight:700,letterSpacing:'.5px',textTransform:'uppercase',padding:'5px 0 2px'}}>{label}</span>
                      <span style={{fontSize:10,color:'var(--txt3)',fontFamily:'var(--font)',letterSpacing:'.5px',paddingBottom:6}}>
                        {cd>0?`${cd}s`:matchRunning?'pronto':'aguarde'}
                      </span>
                    </button>
                  )
                })}
              </div>
              {!matchRunning&&(
                <div style={{marginTop:12,textAlign:'center'}}>
                  <Btn primary onClick={startMatch}>
                    <i className="ti ti-player-play"/> {matchTime===5400?'Iniciar partida':'Nova partida'}
                  </Btn>
                </div>
              )}
            </Card>
            <Card>
              <CardTitle>Feed</CardTitle>
              <div style={{maxHeight:220,overflowY:'auto',display:'flex',flexDirection:'column',gap:5}}>
                {feed.map((f,i)=>(
                  <div key={i} style={{fontSize:12,padding:'6px 10px',borderRadius:8,
                    background:f.cls==='g'?'rgba(0,214,143,.1)':f.cls==='f'?'rgba(255,184,48,.1)':'var(--bg2)',
                    border:`1px solid ${f.cls==='g'?'rgba(0,214,143,.3)':f.cls==='f'?'rgba(255,184,48,.3)':'var(--border)'}`,
                    color:f.cls==='g'?'var(--g)':f.cls==='f'?'var(--amber)':'var(--txt2)'}}>
                    {f.msg}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* DRILLS */}
        {page==='drills'&&(
          <div>
            <div style={{fontFamily:'var(--font)',fontSize:24,fontWeight:800,letterSpacing:1,textTransform:'uppercase',marginBottom:4}}>Drills de treino</div>
            <div style={{fontSize:12,color:'var(--txt2)',marginBottom:14}}>Atributos sobem permanentemente até 99. Quanto mais alto, melhor no jogo.</div>
            {matchRunning&&(
              <div style={{background:'rgba(255,184,48,.1)',border:'1px solid rgba(255,184,48,.3)',borderRadius:8,padding:'10px 14px',marginBottom:14,fontSize:12,color:'var(--amber)',display:'flex',alignItems:'center',gap:8}}>
                <i className="ti ti-alert-triangle"/> Partida em andamento! Os drills ficam disponíveis após o apito final.
              </div>
            )}
            <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:8,marginBottom:12}}>
              {DRILL_DEFS.map(d=>{
                const count=drillsDone.filter(x=>x===d.id).length, done=count>=d.limit
                return(
                  <div key={d.id}
                    onPointerUp={(e)=>{ e.stopPropagation(); if(!done) openDrill(d) }}
                    style={{background:'var(--card)',border:`1px solid ${done?'var(--border)':'var(--border2)'}`,borderRadius:12,
                      cursor:done?'not-allowed':'pointer',transition:'all .15s',textAlign:'center',overflow:'hidden',opacity:done?.5:1,
                      userSelect:'none'}}>
                    <div style={{height:60,background:'var(--bg2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:32}}>
                      {d.emoji}
                    </div>
                    <div style={{padding:'10px 6px'}}>
                      <div style={{fontFamily:'var(--font)',fontSize:12,fontWeight:700,letterSpacing:'.5px',textTransform:'uppercase',marginBottom:2}}>{d.name}</div>
                      <div style={{fontSize:10,color:'var(--txt2)'}}>{count}/{d.limit} hoje</div>
                      <div style={{fontSize:10,color:'var(--g)',marginTop:2}}>+{d.gain} {d.attr.replace('attr_','')}</div>
                    </div>
                  </div>
                )
              })}
            </div>
            {activeDrill&&(
              <Card>
                <CardTitle>Treino de {activeDrill.name}</CardTitle>
                <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:10,padding:16,textAlign:'center'}}>
                  <div style={{fontSize:12,color:'var(--txt2)',marginBottom:4}}>Clique quando o marcador estiver na zona verde!</div>
                  <div
                    onClick={hitTarget}
                    style={{width:'100%',height:18,background:'var(--bg3)',borderRadius:9,overflow:'hidden',position:'relative',margin:'12px 0',cursor:'pointer',border:'1px solid var(--border)'}}>
                    <div style={{position:'absolute',top:0,left:'37%',width:'26%',height:'100%',background:'var(--g)',opacity:.3,borderRadius:6}}/>
                    <div style={{position:'absolute',top:0,width:'12%',height:'100%',background:'var(--g)',borderRadius:6,left:`${markerPos}%`,boxShadow:'0 0 10px rgba(0,214,143,.6)',transition:'none'}}/>
                  </div>
                  <div style={{fontFamily:'var(--font)',fontSize:20,fontWeight:800,letterSpacing:1,minHeight:28,margin:'6px 0',
                    color:drillResult.includes('PERFEITO')?'var(--g)':drillResult.includes('BOM')?'var(--amber)':drillResult.includes('ERROU')?'var(--red)':'var(--g)'}}>
                    {drillResult}
                  </div>
                  <div style={{fontSize:11,color:'var(--txt2)'}}>Rodadas: {drillRounds}/5</div>
                </div>
                <div style={{marginTop:10,display:'flex',gap:8,justifyContent:'flex-end'}}>
                  <Btn onClick={closeDrill}>Fechar</Btn>
                </div>
              </Card>
            )}
            <Card>
              <CardTitle>Seus atributos (máx 99)</CardTitle>
              <AttrBar val={p?.attr_forca||50} label="Força"/>
              <AttrBar val={p?.attr_prec||50} label="Precisão"/>
              <AttrBar val={p?.attr_stam||50} label="Stamina"/>
              <AttrBar val={p?.attr_refl||50} label="Reflexo"/>
              <div style={{marginTop:10,padding:10,background:'var(--bg2)',borderRadius:8,fontSize:11,color:'var(--txt2)',lineHeight:1.6}}>
                🔥 <strong style={{color:'var(--g)'}}>Força 99</strong> = chutes valem mais dinheiro<br/>
                🎯 <strong style={{color:'var(--g)'}}>Precisão 99</strong> = 95% chance de acerto<br/>
                ⚡ <strong style={{color:'var(--g)'}}>Stamina 99</strong> = cooldowns bem menores<br/>
                🧠 <strong style={{color:'var(--g)'}}>Reflexo 99</strong> = barra do drill muito mais lenta
              </div>
            </Card>
          </div>
        )}

        {/* RANKING */}
        {page==='ranking'&&(
          <div>
            <div style={{fontFamily:'var(--font)',fontSize:24,fontWeight:800,letterSpacing:1,textTransform:'uppercase',marginBottom:16}}>Rankings</div>
            <div style={{display:'flex',gap:2,background:'var(--bg2)',padding:3,borderRadius:8,width:'fit-content',marginBottom:14,border:'1px solid var(--border)'}}>
              {(['hora','rodada','temp'] as const).map(t=>(
                <div key={t} onClick={()=>{setRankTab(t);loadRanking()}}
                  style={{padding:'6px 14px',borderRadius:6,fontFamily:'var(--font)',fontSize:11,cursor:'pointer',
                    background:rankTab===t?'var(--g)':'transparent',color:rankTab===t?'#000':'var(--txt2)',
                    fontWeight:700,letterSpacing:'.5px',textTransform:'uppercase',transition:'all .13s'}}>
                  {t==='hora'?'Hora':t==='rodada'?'Rodada':'Temporada'}
                </div>
              ))}
            </div>
            <Card>
              <CardTitle>Top jogadores — {rankTab==='hora'?'hora atual':rankTab==='rodada'?'rodada':'temporada'}</CardTitle>
              {rankList.length===0&&(
                <div style={{fontSize:12,color:'var(--txt3)',textAlign:'center',padding:20}}>
                  Nenhum dado ainda. Jogue uma partida!
                </div>
              )}
              {rankList.map((r,i)=>{
                const isMe=r.username===p?.username
                const val=rankTab==='hora'?r.goals_today:r.goals_season
                const rTeam=TEAMS.find(t=>t.id===r.team||t.name===r.team)||TEAMS[0]
                return(
                  <div key={r.username+i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid var(--border)',background:isMe?'rgba(0,214,143,.05)':'transparent'}}>
                    <span style={{width:22,fontFamily:'var(--font)',fontSize:13,fontWeight:700,color:i<3?'var(--amber)':'var(--txt2)',textAlign:'center'}}>{i+1}</span>
                    <MiniShirt primary={rTeam.primary} secondary={rTeam.secondary} size={24}/>
                    <span style={{flex:1,fontSize:13,fontFamily:'var(--font)',fontWeight:isMe?700:500,color:isMe?'var(--g)':'var(--txt)'}}>
                      {r.username}{isMe?' ★':''}
                    </span>
                    <span style={{fontFamily:'var(--font)',fontSize:14,fontWeight:700,color:'var(--g)'}}>{(val||0).toLocaleString()}</span>
                  </div>
                )
              })}
            </Card>
          </div>
        )}

        {/* SHOP */}
        {page==='shop'&&(
          <div>
            <div style={{fontFamily:'var(--font)',fontSize:24,fontWeight:800,letterSpacing:1,textTransform:'uppercase',marginBottom:6}}>Loja</div>
            <div style={{fontSize:13,color:'var(--txt2)',marginBottom:14}}>
              Saldo: <strong style={{color:'var(--g)'}}>{(p?.money||0).toLocaleString()} reais</strong>
            </div>
            <div style={{display:'flex',gap:2,background:'var(--bg2)',padding:3,borderRadius:8,width:'fit-content',marginBottom:14,border:'1px solid var(--border)'}}>
              {(['chuteiras','itens','clube'] as const).map(t=>(
                <div key={t} onClick={()=>setShopTab(t)}
                  style={{padding:'6px 14px',borderRadius:6,fontFamily:'var(--font)',fontSize:11,cursor:'pointer',
                    background:shopTab===t?'var(--g)':'transparent',color:shopTab===t?'#000':'var(--txt2)',
                    fontWeight:700,letterSpacing:'.5px',textTransform:'uppercase',transition:'all .13s'}}>
                  {t.charAt(0).toUpperCase()+t.slice(1)}
                </div>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:10}}>
              {SHOP_ITEMS.filter(i=>i.cat===shopTab).map(item=>{
                const canAfford = item.vip>0 || (p?.money||0)>=item.price
                return(
                  <div key={item.id} style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:12,padding:14,textAlign:'center',
                    opacity:canAfford?1:.6}}>
                    <div style={{fontSize:30,marginBottom:6}}>{item.icon}</div>
                    <div style={{fontFamily:'var(--font)',fontSize:13,fontWeight:700,letterSpacing:'.5px',textTransform:'uppercase',marginBottom:4}}>{item.name}</div>
                    <div style={{fontSize:11,color:'var(--g)',marginBottom:8,minHeight:32}}>{item.desc}</div>
                    <div style={{fontSize:12,color:'var(--amber)',fontFamily:'var(--font)',fontWeight:700,marginBottom:10}}>
                      {item.vip>0?`VIP ${item.vip}`:`R$ ${item.price.toLocaleString()}`}
                    </div>
                    <button onClick={()=>buyItem(item)}
                      style={{width:'100%',padding:'8px',borderRadius:8,cursor:canAfford?'pointer':'not-allowed',
                        border:'none',background:canAfford?'var(--g)':'var(--bg2)',color:canAfford?'#000':'var(--txt3)',
                        fontFamily:'var(--font)',fontSize:11,fontWeight:700,letterSpacing:'.5px',textTransform:'uppercase'}}>
                      {item.vip>0?'Requer VIP':'Comprar'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* CALENDAR */}
        {page==='calendar'&&(
          <div>
            <div style={{fontFamily:'var(--font)',fontSize:24,fontWeight:800,letterSpacing:1,textTransform:'uppercase',marginBottom:16}}>Calendário</div>
            <Card>
              <CardTitle>Junho 2026 — partidas às 19:00 Brasília / 23:00 Londres</CardTitle>
              <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:4}}>
                {['D','S','T','Q','Q','S','S'].map((d,i)=>(
                  <div key={i} style={{textAlign:'center',fontSize:9,color:'var(--txt3)',padding:'2px 0',fontFamily:'var(--font)',fontWeight:700}}>{d}</div>
                ))}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2}}>
                {Array.from({length:30},(_,i)=>i+1).map(d=>{
                  const isMatch=[3,7,10,14,17,21,24,28].includes(d), isToday=d===2
                  return(
                    <div key={d} onClick={()=>isMatch&&notify(`Partida dia ${d}/06 às 19:00 Brasília!`)}
                      style={{height:32,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                        borderRadius:6,fontSize:11,border:`${isToday?'2px':'1px'} solid ${isToday?'var(--g)':isMatch?'rgba(0,214,143,.4)':'rgba(59,130,246,.2)'}`,
                        background:isMatch?'rgba(0,214,143,.12)':'rgba(59,130,246,.06)',
                        color:isMatch?'var(--g)':'#60A5FA',fontFamily:'var(--font)',fontWeight:600,cursor:isMatch?'pointer':'default',gap:1}}>
                      <span style={{fontSize:11,fontWeight:700,lineHeight:1}}>{d}</span>
                      <span style={{fontSize:8,lineHeight:1}}>{isMatch?'⚽':'🏃'}</span>
                    </div>
                  )
                })}
              </div>
              <div style={{display:'flex',gap:14,marginTop:8,fontSize:10,color:'var(--txt2)',fontFamily:'var(--font)',fontWeight:600,textTransform:'uppercase',letterSpacing:'.5px'}}>
                <span><span style={{display:'inline-block',width:8,height:8,background:'rgba(0,214,143,.2)',borderRadius:2,marginRight:3}}/>Partida</span>
                <span><span style={{display:'inline-block',width:8,height:8,background:'rgba(59,130,246,.12)',borderRadius:2,marginRight:3}}/>Drill</span>
              </div>
            </Card>
            <Card>
              <CardTitle>Times do Brasileirão 2026</CardTitle>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(72px,1fr))',gap:8}}>
                {TEAMS.map(t=>(
                  <div key={t.id} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'8px 4px',borderRadius:8,background:'var(--bg2)',border:'1px solid var(--border)'}}>
                    <MiniShirt primary={t.primary} secondary={t.secondary} size={30}/>
                    <span style={{fontFamily:'var(--font)',fontSize:9,fontWeight:700,color:'var(--txt2)'}}>{t.abbr}</span>
                    <span style={{fontSize:8,color:'var(--txt3)',textAlign:'center'}}>{t.name}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* PROFILE */}
        {page==='profile'&&(
          <div>
            <div style={{fontFamily:'var(--font)',fontSize:24,fontWeight:800,letterSpacing:1,textTransform:'uppercase',marginBottom:16}}>Perfil</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <Card>
                <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
                  <div style={{width:50,height:50,borderRadius:'50%',background:'rgba(0,214,143,.15)',border:'2px solid rgba(0,214,143,.3)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font)',fontSize:16,fontWeight:800,color:'var(--g)'}}>
                    {p?.username?.substring(0,2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{fontFamily:'var(--font)',fontSize:16,fontWeight:800,letterSpacing:1,textTransform:'uppercase'}}>{p?.username}</div>
                    <div style={{display:'flex',alignItems:'center',gap:6,marginTop:4}}>
                      <MiniShirt primary={playerTeam.primary} secondary={playerTeam.secondary} size={20}/>
                      <span style={{fontSize:11,color:'var(--g)'}}>{playerTeam.name}</span>
                    </div>
                  </div>
                </div>
                <div style={{height:1,background:'var(--border)',margin:'10px 0'}}/>
                {[
                  {lbl:'Gols hoje',val:p?.goals_today||0},
                  {lbl:'Gols temporada',val:p?.goals_season||0},
                  {lbl:'Aproveitamento',val:`${(p?.acertos||0)+(p?.erros||0)>0?Math.round(((p?.acertos||0)/((p?.acertos||0)+(p?.erros||0)))*100):0}%`},
                  {lbl:'Saldo',val:`R$ ${(p?.money||0).toLocaleString()}`},
                ].map(r=>(
                  <div key={r.lbl} style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:8}}>
                    <span style={{color:'var(--txt2)'}}>{r.lbl}</span>
                    <strong style={{fontFamily:'var(--font)',fontSize:14}}>{r.val}</strong>
                  </div>
                ))}
              </Card>
              <Card>
                <CardTitle>Atributos (máx 99)</CardTitle>
                <AttrBar val={p?.attr_forca||50} label="Força"/>
                <AttrBar val={p?.attr_prec||50} label="Precisão"/>
                <AttrBar val={p?.attr_stam||50} label="Stamina"/>
                <AttrBar val={p?.attr_refl||50} label="Reflexo"/>
              </Card>
            </div>
          </div>
        )}

        {/* JOGOS DA RODADA */}
        {page==='jogos'&&(
          <div>
            <div style={{fontFamily:'var(--font)',fontSize:24,fontWeight:800,letterSpacing:1,textTransform:'uppercase',marginBottom:4}}>Jogos da Rodada</div>
            <div style={{fontSize:12,color:'var(--txt2)',marginBottom:16}}>Rodada {getCurrentFixtures().round} de 38 — toda Terça e Sábado às 19:00 Brasília</div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {getCurrentFixtures().fixtures.map((f,i)=>{
                const home = TEAMS.find(t=>t.id===f.home)!
                const away = TEAMS.find(t=>t.id===f.away)!
                const isPlayerGame = p?.team===f.home || p?.team===f.away
                const status = getLondonMatchStatus()
                const isLive = status.isMatchTime
                return(
                  <div key={i} style={{
                    background:isPlayerGame?'rgba(0,214,143,.08)':'var(--card)',
                    border:`1px solid ${isPlayerGame?'rgba(0,214,143,.4)':'var(--border)'}`,
                    borderRadius:12,padding:'14px 16px',
                    display:'flex',alignItems:'center',gap:12
                  }}>
                    {/* Home team */}
                    <div style={{flex:1,display:'flex',alignItems:'center',gap:10,justifyContent:'flex-end'}}>
                      <span style={{fontFamily:'var(--font)',fontSize:13,fontWeight:700,letterSpacing:'.3px',textTransform:'uppercase',textAlign:'right',color:p?.team===f.home?'var(--g)':'var(--txt)'}}>{home.name}</span>
                      <MiniShirt primary={home.primary} secondary={home.secondary} size={36}/>
                    </div>
                    {/* Score / status */}
                    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,minWidth:80}}>
                      {isLive?(
                        <div style={{display:'flex',alignItems:'center',gap:6,background:'rgba(0,214,143,.15)',border:'1px solid rgba(0,214,143,.4)',borderRadius:20,padding:'3px 10px'}}>
                          <div style={{width:6,height:6,borderRadius:'50%',background:'var(--g)',animation:'pulse 1.5s infinite'}}/>
                          <span style={{fontFamily:'var(--font)',fontSize:11,fontWeight:700,color:'var(--g)',letterSpacing:'.5px'}}>AO VIVO</span>
                        </div>
                      ):(
                        <span style={{fontFamily:'var(--font)',fontSize:11,fontWeight:700,color:'var(--txt3)',letterSpacing:'.5px',textTransform:'uppercase'}}>19:00</span>
                      )}
                      <span style={{fontSize:10,color:'var(--txt3)'}}>Ter · Sáb</span>
                      {isPlayerGame&&<span style={{fontSize:9,color:'var(--g)',fontFamily:'var(--font)',fontWeight:700,letterSpacing:'.5px',textTransform:'uppercase'}}>SEU JOGO</span>}
                    </div>
                    {/* Away team */}
                    <div style={{flex:1,display:'flex',alignItems:'center',gap:10}}>
                      <MiniShirt primary={away.primary} secondary={away.secondary} size={36}/>
                      <span style={{fontFamily:'var(--font)',fontSize:13,fontWeight:700,letterSpacing:'.3px',textTransform:'uppercase',color:p?.team===f.away?'var(--g)':'var(--txt)'}}>{away.name}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* TABELA DO BRASILEIRÃO */
        {page==='standings'&&(
          <div>
            <div style={{fontFamily:'var(--font)',fontSize:24,fontWeight:800,letterSpacing:1,textTransform:'uppercase',marginBottom:16}}>Tabela do Brasileirão</div>
            <Card style={{padding:0,overflow:'hidden'}}>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                  <thead>
                    <tr style={{background:'var(--bg2)',borderBottom:'1px solid var(--border)'}}>
                      {['#','Time','P','J','V','E','D','GP','GC','SG'].map(h=>(
                        <th key={h} style={{padding:'10px 8px',textAlign:h==='Time'?'left':'center',fontFamily:'var(--font)',fontSize:10,fontWeight:700,color:'var(--txt2)',letterSpacing:'.5px',textTransform:'uppercase',whiteSpace:'nowrap'}}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {STANDINGS.map((s,i)=>{
                      const t = TEAMS.find(t=>t.id===s.id)||TEAMS[0]
                      const isPlayer = t.id === p?.team
                      return(
                        <tr key={s.id} style={{borderBottom:'1px solid var(--border)',background:isPlayer?'rgba(0,214,143,.06)':'transparent'}}>
                          <td style={{padding:'8px',textAlign:'center',fontFamily:'var(--font)',fontWeight:700,color:i<4?'var(--g)':i<6?'#60A5FA':i>16?'var(--red)':'var(--txt2)',width:32}}>{i+1}</td>
                          <td style={{padding:'8px 8px 8px 4px',minWidth:140}}>
                            <div style={{display:'flex',alignItems:'center',gap:8}}>
                              <MiniShirt primary={t.primary} secondary={t.secondary} size={22}/>
                              <span style={{fontFamily:'var(--font)',fontWeight:isPlayer?700:500,color:isPlayer?'var(--g)':'var(--txt)',letterSpacing:'.3px'}}>{t.name}</span>
                            </div>
                          </td>
                          <td style={{padding:'8px',textAlign:'center',fontFamily:'var(--font)',fontWeight:800,color:'var(--g)'}}>{s.pts}</td>
                          <td style={{padding:'8px',textAlign:'center',color:'var(--txt2)'}}>{s.j}</td>
                          <td style={{padding:'8px',textAlign:'center',color:'var(--g)'}}>{s.v}</td>
                          <td style={{padding:'8px',textAlign:'center',color:'var(--amber)'}}>{s.e}</td>
                          <td style={{padding:'8px',textAlign:'center',color:'var(--red)'}}>{s.d}</td>
                          <td style={{padding:'8px',textAlign:'center',color:'var(--txt2)'}}>{s.gp}</td>
                          <td style={{padding:'8px',textAlign:'center',color:'var(--txt2)'}}>{s.gc}</td>
                          <td style={{padding:'8px',textAlign:'center',color:s.gp-s.gc>0?'var(--g)':s.gp-s.gc<0?'var(--red)':'var(--txt2)',fontWeight:700}}>{s.gp-s.gc>0?'+':''}{s.gp-s.gc}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{padding:'10px 12px',borderTop:'1px solid var(--border)',display:'flex',gap:16,fontSize:10,color:'var(--txt2)',flexWrap:'wrap'}}>
                <span><span style={{display:'inline-block',width:10,height:10,background:'rgba(0,214,143,.3)',borderRadius:2,marginRight:4}}/>Libertadores (1-4)</span>
                <span><span style={{display:'inline-block',width:10,height:10,background:'rgba(96,165,250,.3)',borderRadius:2,marginRight:4}}/>Sul-Americana (5-6)</span>
                <span><span style={{display:'inline-block',width:10,height:10,background:'rgba(255,71,87,.3)',borderRadius:2,marginRight:4}}/>Rebaixamento (18-20)</span>
              </div>
            </Card>
          </div>
        )}

      </div>

      {notifMsg&&(
        <div style={{position:'fixed',top:16,right:16,background:'var(--g)',color:'#000',padding:'10px 18px',borderRadius:8,fontFamily:'var(--font)',fontSize:13,fontWeight:800,letterSpacing:'.5px',textTransform:'uppercase',boxShadow:'0 4px 20px rgba(0,214,143,.3)',zIndex:9999}}>
          {notifMsg}
        </div>
      )}
      <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(.7)}}`}</style>
    </div>
    </>
  )
}
