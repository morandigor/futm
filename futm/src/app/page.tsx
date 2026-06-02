'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, type Profile } from '@/lib/supabase'

type Page = 'home'|'match'|'drills'|'ranking'|'shop'|'calendar'|'profile'
type RankEntry = { username: string; team: string; goals_season: number; goals_today: number; position: number }

// 20 Times Brasileirão 2026
const TEAMS = [
  {id:'palmeiras',name:'Palmeiras',abbr:'PAL',primary:'#006437',secondary:'#FFFFFF',city:'São Paulo'},
  {id:'flamengo',name:'Flamengo',abbr:'FLA',primary:'#CC0000',secondary:'#000000',city:'Rio de Janeiro'},
  {id:'fluminense',name:'Fluminense',abbr:'FLU',primary:'#6A0F28',secondary:'#3C5C2C',city:'Rio de Janeiro'},
  {id:'saopaulo',name:'São Paulo',abbr:'SPF',primary:'#FFFFFF',secondary:'#CC0000',city:'São Paulo'},
  {id:'athletico',name:'Athletico-PR',abbr:'CAP',primary:'#CC0000',secondary:'#000000',city:'Curitiba'},
  {id:'bahia',name:'Bahia',abbr:'BAH',primary:'#0066CC',secondary:'#CC0000',city:'Salvador'},
  {id:'coritiba',name:'Coritiba',abbr:'CFC',primary:'#006400',secondary:'#FFFFFF',city:'Curitiba'},
  {id:'botafogo',name:'Botafogo',abbr:'BOT',primary:'#000000',secondary:'#FFFFFF',city:'Rio de Janeiro'},
  {id:'bragantino',name:'Bragantino',abbr:'BRA',primary:'#CC0000',secondary:'#FFFFFF',city:'Bragança Paulista'},
  {id:'vasco',name:'Vasco',abbr:'VAS',primary:'#000000',secondary:'#FFFFFF',city:'Rio de Janeiro'},
  {id:'gremio',name:'Grêmio',abbr:'GRE',primary:'#0066CC',secondary:'#000000',city:'Porto Alegre'},
  {id:'cruzeiro',name:'Cruzeiro',abbr:'CRU',primary:'#0033CC',secondary:'#FFFFFF',city:'Belo Horizonte'},
  {id:'vitoria',name:'Vitória',abbr:'VIT',primary:'#CC0000',secondary:'#000000',city:'Salvador'},
  {id:'corinthians',name:'Corinthians',abbr:'COR',primary:'#000000',secondary:'#FFFFFF',city:'São Paulo'},
  {id:'atleticomg',name:'Atlético-MG',abbr:'CAM',primary:'#000000',secondary:'#FFFFFF',city:'Belo Horizonte'},
  {id:'internacional',name:'Internacional',abbr:'INT',primary:'#CC0000',secondary:'#FFFFFF',city:'Porto Alegre'},
  {id:'santos',name:'Santos',abbr:'SAN',primary:'#FFFFFF',secondary:'#000000',city:'Santos'},
  {id:'mirassol',name:'Mirassol',abbr:'MIR',primary:'#FFD700',secondary:'#000000',city:'Mirassol'},
  {id:'remo',name:'Remo',abbr:'REM',primary:'#0033CC',secondary:'#FFFFFF',city:'Belém'},
  {id:'chapecoense',name:'Chapecoense',abbr:'CHP',primary:'#006400',secondary:'#FFFFFF',city:'Chapecó'},
]

const DRILL_DEFS = [
  {id:'chute',name:'Chute',attr:'attr_prec' as keyof Profile,gain:2,limit:3},
  {id:'fisico',name:'Físico',attr:'attr_stam' as keyof Profile,gain:3,limit:3},
  {id:'tatico',name:'Tático',attr:'attr_forca' as keyof Profile,gain:2,limit:2},
  {id:'falta',name:'Falta',attr:'attr_refl' as keyof Profile,gain:2,limit:2},
  {id:'livre',name:'Livre',attr:'attr_forca' as keyof Profile,gain:1,limit:5},
]

const BOOTS = [
  {name:'Bronze',tier:'Básico',bonus:'+2% acerto',price:'R$ 50.000'},
  {name:'Prata',tier:'Intermediário',bonus:'+4% acerto',price:'R$ 120.000'},
  {name:'Ouro',tier:'Avançado',bonus:'+6% acerto',price:'R$ 280.000'},
  {name:'Platina',tier:'Elite',bonus:'+8% acerto',price:'R$ 550.000'},
  {name:'Diamante',tier:'Elite Alta',bonus:'+10% acerto',price:'R$ 900.000'},
  {name:'Lendária',tier:'Lendário',bonus:'+10% + renda',price:'VIP 30'},
]

const ITEMS = [
  {name:'Energia N1',icon:'ti-bolt',desc:'Reduz cooldown • 28h',price:'R$ 40.000'},
  {name:'Energia N5',icon:'ti-bolt',desc:'Cooldown mínimo • 28h',price:'R$ 180.000'},
  {name:'Boost Drible',icon:'ti-player-fast-forward',desc:'-60s no drible • 28h',price:'R$ 60.000'},
  {name:'Caneleira',icon:'ti-shield',desc:'Bônus no escanteio',price:'VIP 1'},
  {name:'Troca de nome',icon:'ti-pencil',desc:'Altera seu nick',price:'R$ 10.000'},
  {name:'Cor do nome',icon:'ti-palette',desc:'Muda visual do nick',price:'VIP 1'},
]

const CLUBE_ITEMS = [
  {name:'Estádio N1',icon:'ti-building-stadium',desc:'+10% renda/jogo',price:'R$ 200.000'},
  {name:'Estádio N2',icon:'ti-building-stadium',desc:'+20% renda/jogo',price:'R$ 450.000'},
  {name:'Estádio N3',icon:'ti-building-stadium',desc:'+35% renda/jogo',price:'R$ 900.000'},
  {name:'Gramado Clássico',icon:'ti-map',desc:'2% nerf adversário',price:'R$ 80.000'},
  {name:'Gramado Europeu',icon:'ti-map',desc:'4% nerf adversário',price:'R$ 350.000'},
  {name:'Gramado Dark',icon:'ti-map',desc:'5% nerf adversário',price:'R$ 600.000'},
]

const SHOOT_MSGS = {
  hit: ['GOOOL!','Que golaço!','No fundo das redes!','Que chute incrível!','Goleiro não chegou!'],
  miss: ['Errou!','Bateu na trave.','Goleiro defendeu!','Fora! Desperdiçou.','Que pena!'],
}

function fmtTimer(s: number) {
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60
  return `${h>0?h+':':''}${m<10&&h>0?'0':''}${m}:${sec<10?'0':''}${sec}`
}
function pick(arr: string[]) { return arr[Math.floor(Math.random()*arr.length)] }

// Get next match time (23:00 London = UTC+1 summer / UTC winter)
function getNextMatchInfo() {
  const now = new Date()
  // London time offset (BST = UTC+1 in summer, GMT = UTC+0 in winter)
  const londonOffset = isDST(now) ? 1 : 0
  const londonHour = (now.getUTCHours() + londonOffset) % 24
  const londonDay = now.getUTCDay()
  // matches on Tue (2) and Sat (6) at 23:00 London
  const matchDays = [2, 6]
  const matchHour = 23
  let daysUntil = 0
  for (let i = 0; i < 8; i++) {
    const checkDay = (londonDay + i) % 7
    if (matchDays.includes(checkDay)) {
      if (i === 0 && londonHour >= matchHour) continue
      daysUntil = i
      break
    }
  }
  const labels = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
  const nextDay = (londonDay + daysUntil) % 7
  return { label: daysUntil === 0 ? 'Hoje' : daysUntil === 1 ? 'Amanhã' : labels[nextDay], daysUntil }
}

function isDST(date: Date) {
  const jan = new Date(date.getFullYear(), 0, 1).getTimezoneOffset()
  const jul = new Date(date.getFullYear(), 6, 1).getTimezoneOffset()
  return Math.max(jan, jul) !== date.getTimezoneOffset()
}

// Mini shirt SVG
function MiniShirt({ primary, secondary, size = 36 }: { primary: string; secondary: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 4 L6 10 L10 11 L10 28 L26 28 L26 11 L30 10 L26 4 L22 6 Q18 8 14 6 Z" fill={primary} stroke={secondary} strokeWidth="1.5"/>
      <path d="M14 6 Q18 8 22 6 L22 10 Q18 12 14 10 Z" fill={secondary}/>
      <line x1="18" y1="10" x2="18" y2="28" stroke={secondary} strokeWidth="1" opacity="0.4"/>
    </svg>
  )
}

// Action animation SVGs
function PenaltiAnim() {
  const gkRef = useRef<SVGGElement>(null)
  useEffect(() => {
    let x = 0, dir = 1
    const iv = setInterval(() => {
      x += dir * 0.8; if(x > 12) dir=-1; if(x < -12) dir=1
      if(gkRef.current) gkRef.current.setAttribute('transform', `translate(${x.toFixed(1)},0)`)
    }, 60)
    return () => clearInterval(iv)
  }, [])
  return (
    <svg width="100%" height="100%" viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="80" fill="#0A1A10"/>
      <rect x="0" y="68" width="120" height="12" fill="#0D2015"/>
      <line x1="38" y1="4" x2="92" y2="4" stroke="#00D68F" strokeWidth="1.5" opacity=".5"/>
      <line x1="38" y1="4" x2="38" y2="26" stroke="#00D68F" strokeWidth="1.5" opacity=".5"/>
      <line x1="92" y1="4" x2="92" y2="26" stroke="#00D68F" strokeWidth="1.5" opacity=".5"/>
      <line x1="38" y1="26" x2="92" y2="26" stroke="#00D68F" strokeWidth="1.5" opacity=".5"/>
      <g ref={gkRef}>
        <circle cx="65" cy="14" r="5" fill="#3B82F6"/>
        <line x1="65" y1="19" x2="65" y2="32" stroke="#3B82F6" strokeWidth="2"/>
        <line x1="55" y1="24" x2="75" y2="24" stroke="#3B82F6" strokeWidth="2.5"/>
        <line x1="65" y1="32" x2="58" y2="42" stroke="#3B82F6" strokeWidth="2"/>
        <line x1="65" y1="32" x2="72" y2="42" stroke="#3B82F6" strokeWidth="2"/>
      </g>
      <g>
        <circle cx="65" cy="60" r="5" fill="#00D68F"/>
        <line x1="65" y1="65" x2="65" y2="75" stroke="#00D68F" strokeWidth="2"/>
        <line x1="58" y1="68" x2="72" y2="68" stroke="#00D68F" strokeWidth="2"/>
      </g>
      <circle cx="65" cy="52" r="4.5" fill="#FFB830" stroke="#CC8800" strokeWidth="0.5"/>
    </svg>
  )
}

function FaltaAnim() {
  const ballRef = useRef<SVGCircleElement>(null)
  useEffect(() => {
    let t = 0
    const iv = setInterval(() => {
      t += 0.04
      const x = 32 + t * 60 % 90
      const y = 56 - Math.sin(t * 3.14 % Math.PI) * 30
      if(ballRef.current) { ballRef.current.setAttribute('cx', x.toFixed(1)); ballRef.current.setAttribute('cy', y.toFixed(1)) }
      if(t > 1.1) t = 0
    }, 30)
    return () => clearInterval(iv)
  }, [])
  return (
    <svg width="100%" height="100%" viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="80" fill="#0A1A10"/>
      <rect x="0" y="68" width="120" height="12" fill="#0D2015"/>
      <line x1="70" y1="4" x2="110" y2="4" stroke="#00D68F" strokeWidth="1.5" opacity=".5"/>
      <line x1="70" y1="4" x2="70" y2="24" stroke="#00D68F" strokeWidth="1.5" opacity=".5"/>
      <line x1="110" y1="4" x2="110" y2="24" stroke="#00D68F" strokeWidth="1.5" opacity=".5"/>
      <line x1="70" y1="24" x2="110" y2="24" stroke="#00D68F" strokeWidth="1.5" opacity=".5"/>
      <circle cx="75" cy="18" r="4" fill="#3B82F6"/>
      <circle cx="83" cy="16" r="4" fill="#3B82F6"/>
      <circle cx="91" cy="18" r="4" fill="#3B82F6"/>
      <g>
        <circle cx="22" cy="52" r="5" fill="#00D68F"/>
        <line x1="22" y1="57" x2="22" y2="68" stroke="#00D68F" strokeWidth="2"/>
        <line x1="15" y1="61" x2="32" y2="61" stroke="#00D68F" strokeWidth="2"/>
      </g>
      <circle ref={ballRef} cx="32" cy="56" r="4" fill="#FFB830" stroke="#CC8800" strokeWidth="0.5"/>
    </svg>
  )
}

function DribleAnim() {
  const plRef = useRef<SVGGElement>(null)
  const ballRef = useRef<SVGCircleElement>(null)
  useEffect(() => {
    let x = 20, going = true
    const iv = setInterval(() => {
      x += going ? 1.2 : -1.2
      if(x > 55) going = false
      if(x < 20) going = true
      const bob = Math.sin(x * 0.3) * 2
      if(plRef.current) plRef.current.setAttribute('transform', `translate(${x-20},${bob.toFixed(1)})`)
      if(ballRef.current) { ballRef.current.setAttribute('cx', (x+8).toFixed(1)); ballRef.current.setAttribute('cy', (50+bob).toFixed(1)) }
    }, 30)
    return () => clearInterval(iv)
  }, [])
  return (
    <svg width="100%" height="100%" viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="80" fill="#0A1A10"/>
      <rect x="0" y="68" width="120" height="12" fill="#0D2015"/>
      <g>
        <circle cx="72" cy="38" r="5" fill="#3B82F6"/>
        <line x1="72" y1="43" x2="72" y2="54" stroke="#3B82F6" strokeWidth="2"/>
        <line x1="65" y1="47" x2="79" y2="47" stroke="#3B82F6" strokeWidth="2"/>
        <line x1="72" y1="54" x2="65" y2="64" stroke="#3B82F6" strokeWidth="2"/>
        <line x1="72" y1="54" x2="79" y2="64" stroke="#3B82F6" strokeWidth="2"/>
      </g>
      <circle cx="50" cy="44" r="1.5" fill="#FFB830" opacity=".4"/>
      <circle cx="60" cy="36" r="1.5" fill="#FFB830" opacity=".4"/>
      <g ref={plRef}>
        <circle cx="20" cy="38" r="5" fill="#00D68F"/>
        <line x1="20" y1="43" x2="20" y2="54" stroke="#00D68F" strokeWidth="2"/>
        <line x1="13" y1="47" x2="27" y2="47" stroke="#00D68F" strokeWidth="2"/>
        <line x1="20" y1="54" x2="13" y2="64" stroke="#00D68F" strokeWidth="2"/>
        <line x1="20" y1="54" x2="27" y2="64" stroke="#00D68F" strokeWidth="2"/>
      </g>
      <circle ref={ballRef} cx="28" cy="50" r="4" fill="#FFB830" stroke="#CC8800" strokeWidth="0.5"/>
    </svg>
  )
}

function EscanteioAnim() {
  const jmpRef = useRef<SVGGElement>(null)
  const ballRef = useRef<SVGCircleElement>(null)
  useEffect(() => {
    let t = 0
    const iv = setInterval(() => {
      t += 0.05
      const ballX = 15 + (t % 1.5) * 60
      const ballY = 62 - Math.sin((t % 1.5) * Math.PI / 1.5) * 40
      if(ballRef.current) { ballRef.current.setAttribute('cx', ballX.toFixed(1)); ballRef.current.setAttribute('cy', ballY.toFixed(1)) }
      const jmpY = Math.abs(Math.sin(t * 2)) * -8
      if(jmpRef.current) jmpRef.current.setAttribute('transform', `translate(0,${jmpY.toFixed(1)})`)
    }, 30)
    return () => clearInterval(iv)
  }, [])
  return (
    <svg width="100%" height="100%" viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg">
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
      <g>
        <circle cx="10" cy="58" r="5" fill="#00D68F"/>
        <line x1="10" y1="63" x2="10" y2="73" stroke="#00D68F" strokeWidth="2"/>
        <line x1="3" y1="66" x2="17" y2="66" stroke="#00D68F" strokeWidth="2"/>
      </g>
      <circle ref={ballRef} cx="15" cy="62" r="4" fill="#FFB830" stroke="#CC8800" strokeWidth="0.5"/>
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
  const [opponent, setOpponent] = useState(TEAMS[0])
  const matchRef = useRef<ReturnType<typeof setInterval>|null>(null)
  const cdRef = useRef({penalti:0,falta:0,auto:0,escanteio:0})
  const markerRef = useRef({pos:0,dir:1,animId:0})
  const matchIdRef = useRef<string|null>(null)

  const notify = useCallback((msg: string) => {
    setNotifMsg(msg)
    setTimeout(() => setNotifMsg(''), 2400)
  }, [])

  // Pick random opponent different from player's team
  function pickOpponent(playerTeam: string) {
    const others = TEAMS.filter(t => t.id !== playerTeam)
    return others[Math.floor(Math.random() * others.length)]
  }

  async function doLogin() {
    setAuthErr(''); setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setAuthErr('Email ou senha incorretos')
  }

  async function doRegister() {
    setAuthErr('')
    if (!username.trim() || !email.trim() || !password || !selectedTeam) {
      setAuthErr('Preencha todos os campos'); return
    }
    const { data: exists } = await supabase.from('profiles').select('id').eq('username', username.trim()).maybeSingle()
    if (exists) { setAuthErr('Usuário já existe'); return }
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { username: username.trim(), team: selectedTeam } }
    })
    setLoading(false)
    if (error) setAuthErr(error.message)
    else notify('Conta criada! Verifique seu email se necessário.')
  }

  async function doLogout() {
    // Don't stop the match — it keeps running server-side via Supabase
    await supabase.auth.signOut()
    setLoggedIn(false); setProfile(null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) loadProfile(session.user.id)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) loadProfile(session.user.id)
      else { setLoggedIn(false); setProfile(null) }
    })
    return () => subscription.unsubscribe()
  }, [])

  // Keep match running even when user leaves — sync goals to Supabase on each goal
  useEffect(() => {
    return () => {
      if (matchRef.current) clearInterval(matchRef.current)
    }
  }, [])

  async function loadProfile(userId: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (data) {
      setProfile(data as Profile)
      setDrillsDone(data.drills_done || [])
      setLoggedIn(true)
      const opp = pickOpponent(data.id)
      setOpponent(opp)
      loadRanking()
    }
  }

  async function saveProfile(updates: Partial<Profile>) {
    if (!profile) return
    const { data } = await supabase.from('profiles').update(updates).eq('id', profile.id).select().single()
    if (data) setProfile(data as Profile)
  }

  async function loadRanking() {
    const { data } = await supabase.from('ranking_season').select('*')
    if (data && data.length > 0) setRankList(data as RankEntry[])
  }

  function startMatch() {
    if (matchRunning) return
    const opp = profile ? pickOpponent(profile.id) : TEAMS[0]
    setOpponent(opp)
    setMatchRunning(true); setMatchTime(5400)
    setScoreH(0); setScoreA(0); setAcertos(0); setErros(0)
    setMatchPhase('1º Tempo')
    setFeed([{msg:'Apito inicial! A partida começou.',cls:''}])
    cdRef.current = {penalti:0,falta:0,auto:0,escanteio:0}
    setCooldowns({penalti:0,falta:0,auto:0,escanteio:0})
    if (matchRef.current) clearInterval(matchRef.current)
    matchRef.current = setInterval(tickMatch, 1000)
  }

  const tickMatch = useCallback(() => {
    setMatchTime(prev => {
      const t = prev - 1
      if (t === 2700) { setMatchPhase('Intervalo'); addFeedItem('Intervalo!','f') }
      if (t === 2400) { setMatchPhase('2º Tempo'); addFeedItem('2º Tempo!','') }
      if (t <= 0) {
        if (matchRef.current) clearInterval(matchRef.current)
        setMatchRunning(false); setMatchPhase('Fim')
        setScoreH(h => { setScoreA(a => {
          const r = h>a?'Vitória!':h<a?'Derrota.':'Empate.'
          addFeedItem('Fim! '+r, h>=a?'g':'m')
          return a
        }); return h })
        setCooldowns({penalti:0,falta:0,auto:0,escanteio:0})
        return 0
      }
      if (Math.random() < 0.022) {
        setScoreA(a => { addFeedItem('Gol do adversário!','m'); return a+1 })
      }
      cdRef.current = {
        penalti: Math.max(0,cdRef.current.penalti-1),
        falta: Math.max(0,cdRef.current.falta-1),
        auto: Math.max(0,cdRef.current.auto-1),
        escanteio: Math.max(0,cdRef.current.escanteio-1),
      }
      setCooldowns({...cdRef.current})
      return t
    })
  }, [])

  function addFeedItem(msg: string, cls: string) {
    setFeed(prev => [{msg,cls},...prev].slice(0,20))
  }

  async function doShoot(type: 'penalti'|'falta'|'auto'|'escanteio') {
    if (!matchRunning || cdRef.current[type] > 0 || !profile) return
    const acc = Math.min(95, profile.attr_prec + profile.attr_refl * 0.1)
    const hit = Math.random()*100 < acc
    const cds = {penalti:29,falta:44,auto:59,escanteio:89}
    cdRef.current[type] = cds[type]
    setCooldowns({...cdRef.current})
    if (hit) {
      setAcertos(a => a+1); setScoreH(h => h+1)
      addFeedItem(pick(SHOOT_MSGS.hit),'g')
      const updates = { goals_today: profile.goals_today+1, goals_season: profile.goals_season+1, acertos: profile.acertos+1 }
      setProfile(p => p ? {...p,...updates} : p)
      await saveProfile(updates)
      loadRanking()
    } else {
      setErros(e => e+1)
      addFeedItem(pick(SHOOT_MSGS.miss),'m')
      await saveProfile({ erros: profile.erros+1 })
    }
  }

  function openDrill(d: typeof DRILL_DEFS[0]) {
    setActiveDrill(d); setDrillRounds(0); setDrillScore(0); setDrillResult('')
    if (profile) startMarker(profile.attr_refl)
  }

  function startMarker(refl: number) {
    cancelAnimationFrame(markerRef.current.animId)
    markerRef.current.pos = 0; markerRef.current.dir = 1
    const speed = 1.5 + (100-refl)*0.014
    function animate() {
      markerRef.current.pos += markerRef.current.dir * speed
      if (markerRef.current.pos >= 88) { markerRef.current.pos = 88; markerRef.current.dir = -1 }
      if (markerRef.current.pos <= 0) { markerRef.current.pos = 0; markerRef.current.dir = 1 }
      setMarkerPos(markerRef.current.pos)
      markerRef.current.animId = requestAnimationFrame(animate)
    }
    animate()
  }

  function closeDrill() {
    cancelAnimationFrame(markerRef.current.animId)
    setActiveDrill(null)
  }

  async function hitTarget() {
    if (drillRounds >= 5 || !activeDrill || !profile) return
    const hit = markerPos >= 37 && markerPos <= 63
    const near = markerPos >= 25 && markerPos <= 75
    const pts = hit ? 2 : near ? 1 : 0
    const newRounds = drillRounds + 1
    const newScore = drillScore + pts
    setDrillRounds(newRounds); setDrillScore(newScore)
    setDrillResult(hit ? 'PERFEITO! +2' : near ? 'BOM! +1' : 'ERROU!')
    if (newRounds >= 5) {
      cancelAnimationFrame(markerRef.current.animId)
      const gain = Math.max(1, Math.round(newScore * activeDrill.gain * 0.5))
      const attrKey = activeDrill.attr
      const newVal = Math.min(99, (profile[attrKey] as number) + gain)
      const newDrills = [...drillsDone, activeDrill.id]
      setDrillsDone(newDrills)
      setDrillResult(`CONCLUÍDO! +${gain} ${activeDrill.attr.replace('attr_','').toUpperCase()}`)
      notify(`+${gain} ${activeDrill.attr.replace('attr_','').toUpperCase()}!`)
      const updates: Partial<Profile> = { [attrKey]: newVal, drills_done: newDrills }
      setProfile(p => p ? {...p,...updates} : p)
      await saveProfile(updates)
      setTimeout(() => setActiveDrill(null), 1200)
    }
  }

  const p = profile
  const nextMatch = getNextMatchInfo()
  const playerTeam = TEAMS.find(t => t.id === p?.team) || TEAMS.find(t => t.name === p?.team) || TEAMS[0]

  function AttrBar({val, label}: {val:number, label:string}) {
    return (
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
        <span style={{fontFamily:'var(--font)',fontSize:11,color:'var(--txt2)',width:72,flexShrink:0,textTransform:'uppercase',letterSpacing:'.5px',fontWeight:600}}>{label}</span>
        <div style={{flex:1,height:6,background:'var(--bg2)',borderRadius:3,overflow:'hidden'}}>
          <div style={{height:'100%',borderRadius:3,background:'var(--g)',width:`${val}%`,transition:'width .4s'}}/>
        </div>
        <span style={{fontFamily:'var(--font)',fontSize:12,fontWeight:700,width:26,textAlign:'right',color:'var(--g)'}}>{val}</span>
      </div>
    )
  }

  function Btn({children, primary, onClick, disabled, style}: any) {
    return (
      <button onClick={onClick} disabled={disabled} style={{
        display:'inline-flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:8,
        fontSize:12,cursor:disabled?'not-allowed':'pointer',
        border:`1px solid ${primary?'var(--g)':'var(--border2)'}`,
        background:primary?'var(--g)':'var(--card2)',
        color:primary?'#000':'var(--txt)',
        fontFamily:'var(--font)',fontWeight:700,letterSpacing:'.5px',textTransform:'uppercase',
        opacity:disabled?.35:1,transition:'all .13s',...style
      }}>{children}</button>
    )
  }

  function Badge({children, variant='g'}: {children:React.ReactNode, variant?:'g'|'r'|'a'|'gr'}) {
    const styles: Record<string,React.CSSProperties> = {
      g:{background:'rgba(0,214,143,.15)',color:'var(--g)',border:'1px solid rgba(0,214,143,.3)'},
      r:{background:'rgba(255,71,87,.15)',color:'var(--red)',border:'1px solid rgba(255,71,87,.3)'},
      a:{background:'rgba(255,184,48,.15)',color:'var(--amber)',border:'1px solid rgba(255,184,48,.3)'},
      gr:{background:'var(--bg2)',color:'var(--txt2)',border:'1px solid var(--border)'},
    }
    return <span style={{display:'inline-block',fontSize:10,padding:'2px 8px',borderRadius:20,fontWeight:700,fontFamily:'var(--font)',letterSpacing:'.5px',textTransform:'uppercase',...styles[variant]}}>{children}</span>
  }

  function Card({children, style}: {children:React.ReactNode, style?:React.CSSProperties}) {
    return <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:12,padding:16,marginBottom:12,...style}}>{children}</div>
  }

  function CardTitle({children}: {children:React.ReactNode}) {
    return <div style={{fontFamily:'var(--font)',fontSize:11,fontWeight:700,color:'var(--txt2)',marginBottom:12,letterSpacing:1,textTransform:'uppercase'}}>{children}</div>
  }

  if (!loggedIn) return (
    <div style={{position:'fixed',inset:0,background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center',
      backgroundImage:'radial-gradient(ellipse at 20% 50%,rgba(0,214,143,.06) 0%,transparent 60%)'}}>
      <div style={{width:380,background:'var(--card)',border:'1px solid var(--border2)',borderRadius:16,padding:36,position:'relative',overflow:'hidden',maxHeight:'90vh',overflowY:'auto'}}>
        <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,transparent,var(--g),transparent)'}}/>
        <div style={{fontFamily:'var(--font)',fontSize:34,fontWeight:800,textAlign:'center',marginBottom:4,letterSpacing:2,textTransform:'uppercase'}}>
          FU<span style={{color:'var(--g)'}}>TM</span>
        </div>
        <div style={{fontSize:12,color:'var(--txt2)',textAlign:'center',marginBottom:24,letterSpacing:'.5px',textTransform:'uppercase'}}>O jogo de futebol online</div>
        <div style={{display:'flex',gap:2,background:'var(--bg2)',padding:3,borderRadius:8,marginBottom:20,border:'1px solid var(--border)'}}>
          {(['login','register'] as const).map(t => (
            <div key={t} onClick={() => {setAuthMode(t);setAuthErr('')}}
              style={{flex:1,textAlign:'center',padding:7,fontSize:12,cursor:'pointer',borderRadius:6,
                background:authMode===t?'var(--g)':'transparent',color:authMode===t?'#000':'var(--txt2)',
                fontFamily:'var(--font)',fontWeight:700,letterSpacing:'.5px',textTransform:'uppercase',transition:'all .13s'}}>
              {t==='login'?'Entrar':'Cadastrar'}
            </div>
          ))}
        </div>
        {authMode==='login' ? (
          <>
            {[{label:'Email',val:email,set:setEmail,ph:'seu@email.com'},{label:'Senha',val:password,set:setPassword,ph:'••••••',type:'password'}].map(f => (
              <div key={f.label} style={{marginBottom:12}}>
                <label style={{fontSize:10,color:'var(--txt2)',display:'block',marginBottom:5,letterSpacing:'.8px',textTransform:'uppercase',fontFamily:'var(--font)',fontWeight:600}}>{f.label}</label>
                <input type={(f as any).type||'text'} value={f.val} onChange={e=>f.set(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doLogin()} placeholder={f.ph}
                  style={{width:'100%',padding:'10px 12px',borderRadius:8,border:'1px solid var(--border)',background:'var(--bg2)',color:'var(--txt)',fontSize:14,outline:'none'}}/>
              </div>
            ))}
          </>
        ) : (
          <>
            {[{label:'Usuário',val:username,set:setUsername,ph:'seu nick'},{label:'Email',val:email,set:setEmail,ph:'seu@email.com'},{label:'Senha',val:password,set:setPassword,ph:'••••••',type:'password'}].map(f => (
              <div key={f.label} style={{marginBottom:12}}>
                <label style={{fontSize:10,color:'var(--txt2)',display:'block',marginBottom:5,letterSpacing:'.8px',textTransform:'uppercase',fontFamily:'var(--font)',fontWeight:600}}>{f.label}</label>
                <input type={(f as any).type||'text'} value={f.val} onChange={e=>f.set(e.target.value)} placeholder={f.ph}
                  style={{width:'100%',padding:'10px 12px',borderRadius:8,border:'1px solid var(--border)',background:'var(--bg2)',color:'var(--txt)',fontSize:14,outline:'none'}}/>
              </div>
            ))}
            <div style={{marginBottom:12}}>
              <label style={{fontSize:10,color:'var(--txt2)',display:'block',marginBottom:8,letterSpacing:'.8px',textTransform:'uppercase',fontFamily:'var(--font)',fontWeight:600}}>Seu time</label>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,maxHeight:200,overflowY:'auto'}}>
                {TEAMS.map(t => (
                  <div key={t.id} onClick={() => setSelectedTeam(t.id)}
                    style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,padding:'8px 4px',borderRadius:8,cursor:'pointer',
                      border:`1px solid ${selectedTeam===t.id?'var(--g)':'var(--border)'}`,
                      background:selectedTeam===t.id?'rgba(0,214,143,.1)':'var(--bg2)',transition:'all .12s'}}>
                    <MiniShirt primary={t.primary} secondary={t.secondary} size={28}/>
                    <span style={{fontFamily:'var(--font)',fontSize:9,fontWeight:700,letterSpacing:'.3px',textAlign:'center',color:selectedTeam===t.id?'var(--g)':'var(--txt2)'}}>{t.abbr}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
        {authErr && <div style={{fontSize:12,color:'var(--red)',marginBottom:8,textAlign:'center'}}>{authErr}</div>}
        <Btn primary onClick={authMode==='login'?doLogin:doRegister} disabled={loading} style={{width:'100%',justifyContent:'center'}}>
          {loading?'...':authMode==='login'?'Entrar':'Criar conta'}
        </Btn>
        <div style={{marginTop:14,fontSize:11,color:'var(--txt3)',textAlign:'center'}}>
          {authMode==='login'?'Não tem conta? ':'Já tem conta? '}
          <span onClick={() => {setAuthMode(authMode==='login'?'register':'login');setAuthErr('')}} style={{color:'var(--g)',cursor:'pointer'}}>
            {authMode==='login'?'Cadastre-se':'Entrar'}
          </span>
        </div>
      </div>
    </div>
  )

  const navItems: {id:Page,icon:string,label:string}[] = [
    {id:'home',icon:'ti-home',label:'Início'},
    {id:'match',icon:'ti-ball-football',label:'Partida'},
    {id:'drills',icon:'ti-run',label:'Drills'},
    {id:'ranking',icon:'ti-trophy',label:'Ranking'},
    {id:'shop',icon:'ti-shopping-bag',label:'Loja'},
    {id:'calendar',icon:'ti-calendar',label:'Calendário'},
    {id:'profile',icon:'ti-user',label:'Perfil'},
  ]

  return (
    <div style={{display:'flex',height:'100vh',minHeight:600}}>
      <div style={{width:200,flexShrink:0,background:'var(--bg2)',borderRight:'1px solid var(--border)',display:'flex',flexDirection:'column'}}>
        <div style={{padding:'20px 16px 14px',fontFamily:'var(--font)',fontSize:22,fontWeight:800,letterSpacing:2,textTransform:'uppercase',borderBottom:'1px solid var(--border)'}}>
          FU<span style={{color:'var(--g)'}}>TM</span> <span style={{fontSize:10,color:'var(--txt3)',fontWeight:400,letterSpacing:'.5px'}}>1.0</span>
        </div>
        <div style={{padding:'10px 0'}}>
          {navItems.map(({id,icon,label}) => (
            <div key={id} onClick={() => {setPage(id);if(id==='ranking')loadRanking()}}
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
            {playerTeam && <MiniShirt primary={playerTeam.primary} secondary={playerTeam.secondary} size={28}/>}
            <div>
              <div style={{fontFamily:'var(--font)',fontSize:13,fontWeight:700,letterSpacing:'.5px',textTransform:'uppercase'}}>{p?.username}</div>
              <div style={{fontSize:10,color:'var(--g)',marginTop:1}}>{playerTeam?.name}</div>
            </div>
          </div>
          <button onClick={doLogout} style={{display:'flex',alignItems:'center',gap:6,padding:'5px 10px',borderRadius:8,fontSize:11,cursor:'pointer',border:'1px solid var(--border2)',background:'var(--card2)',color:'var(--txt2)',fontFamily:'var(--font)',fontWeight:600,letterSpacing:'.5px',textTransform:'uppercase'}}>
            <i className="ti ti-logout"/> Sair
          </button>
        </div>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:20,background:'var(--bg)'}}>

        {page==='home' && (
          <div>
            <div style={{fontFamily:'var(--font)',fontSize:24,fontWeight:800,letterSpacing:1,textTransform:'uppercase',marginBottom:16}}>Início</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:12}}>
              {[
                {lbl:'Gols hoje',val:p?.goals_today||0,c:'var(--g)'},
                {lbl:'Temporada',val:p?.goals_season||0,c:'var(--txt)'},
                {lbl:'Dinheiro',val:`${Math.floor((p?.money||0)/1000)}k`,c:'var(--txt)'},
                {lbl:'Próx. partida',val:nextMatch.label,c:'var(--amber)'},
              ].map(s => (
                <div key={s.lbl} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:10,padding:12}}>
                  <div style={{fontFamily:'var(--font)',fontSize:9,color:'var(--txt2)',letterSpacing:'.8px',textTransform:'uppercase',marginBottom:4}}>{s.lbl}</div>
                  <div style={{fontFamily:'var(--font)',fontSize:22,fontWeight:800,letterSpacing:1,color:s.c}}>{s.val}</div>
                </div>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <Card>
                <CardTitle>Missões ativas</CardTitle>
                {[
                  {label:'50 gols na rodada',cur:p?.goals_today||0,max:50},
                  {label:'5 drills esta semana',cur:drillsDone.length,max:5},
                  {label:'Vencer um desafio',cur:0,max:1},
                ].map(m => (
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
                <CardTitle>Atributos</CardTitle>
                <AttrBar val={p?.attr_forca||62} label="Força"/>
                <AttrBar val={p?.attr_prec||70} label="Precisão"/>
                <AttrBar val={p?.attr_stam||55} label="Stamina"/>
                <AttrBar val={p?.attr_refl||48} label="Reflexo"/>
              </Card>
            </div>
            <Card>
              <CardTitle>Próxima partida — 23:00 Londres</CardTitle>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px',background:'var(--bg2)',borderRadius:8,border:'1px solid var(--border)'}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  {playerTeam && <MiniShirt primary={playerTeam.primary} secondary={playerTeam.secondary} size={40}/>}
                  <div>
                    <div style={{fontFamily:'var(--font)',fontSize:14,fontWeight:700,textTransform:'uppercase',letterSpacing:'.5px'}}>{playerTeam?.name}</div>
                    <div style={{fontSize:11,color:'var(--txt2)'}}>Casa</div>
                  </div>
                </div>
                <div style={{textAlign:'center'}}>
                  <Badge variant="g">{nextMatch.label} • 23:00 BST</Badge>
                  <div style={{fontFamily:'var(--font)',fontSize:20,fontWeight:800,marginTop:6,color:'var(--txt3)'}}>VS</div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:10,flexDirection:'row-reverse'}}>
                  <MiniShirt primary={opponent.primary} secondary={opponent.secondary} size={40}/>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontFamily:'var(--font)',fontSize:14,fontWeight:700,textTransform:'uppercase',letterSpacing:'.5px'}}>{opponent.name}</div>
                    <div style={{fontSize:11,color:'var(--txt2)'}}>Visitante</div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {page==='match' && (
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
                ]).map(({type,label,Anim}) => {
                  const cd = cooldowns[type]
                  const disabled = !matchRunning || cd > 0
                  return (
                    <button key={type} onClick={() => doShoot(type)} disabled={disabled}
                      style={{padding:0,borderRadius:10,cursor:disabled?'not-allowed':'pointer',
                        border:`1px solid ${!disabled?'var(--g)':'var(--border)'}`,
                        background:'var(--bg2)',color:'var(--txt)',
                        display:'flex',flexDirection:'column',alignItems:'center',overflow:'hidden',
                        opacity:disabled?.35:1,transition:'border-color .15s'}}>
                      <div style={{width:'100%',height:80,overflow:'hidden'}}>
                        <Anim/>
                      </div>
                      <span style={{fontFamily:'var(--font)',fontSize:13,fontWeight:700,letterSpacing:'.5px',textTransform:'uppercase',padding:'5px 0 2px'}}>{label}</span>
                      <span style={{fontSize:10,color:'var(--txt3)',fontFamily:'var(--font)',letterSpacing:'.5px',paddingBottom:6}}>
                        {cd>0?`${cd}s`:matchRunning?'pronto':'aguarde'}
                      </span>
                    </button>
                  )
                })}
              </div>
              {!matchRunning && (
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
                {feed.map((f,i) => (
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

        {page==='drills' && (
          <div>
            <div style={{fontFamily:'var(--font)',fontSize:24,fontWeight:800,letterSpacing:1,textTransform:'uppercase',marginBottom:6}}>Drills de treino</div>
            <div style={{fontSize:12,color:'var(--txt2)',marginBottom:16}}>Treine nos dias sem partida. Os bônus ativam automaticamente no próximo jogo.</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:8,marginBottom:12}}>
              {DRILL_DEFS.map(d => {
                const count = drillsDone.filter(x=>x===d.id).length
                const done = count >= d.limit
                return (
                  <div key={d.id} onClick={() => !done && openDrill(d)}
                    style={{background:'var(--card)',border:`1px solid ${done?'var(--border)':'var(--border2)'}`,borderRadius:12,
                      cursor:done?'default':'pointer',transition:'all .15s',textAlign:'center',overflow:'hidden',opacity:done?.5:1}}>
                    <div style={{height:60,background:'var(--bg2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,color:done?'var(--txt3)':'var(--g)'}}>
                      {d.id==='chute'?'⚽':d.id==='fisico'?'🏃':d.id==='tatico'?'🧠':d.id==='falta'?'🎯':'⭐'}
                    </div>
                    <div style={{padding:'10px 8px'}}>
                      <div style={{fontFamily:'var(--font)',fontSize:13,fontWeight:700,letterSpacing:'.5px',textTransform:'uppercase',marginBottom:2}}>{d.name}</div>
                      <div style={{fontSize:10,color:'var(--txt2)'}}>{count}/{d.limit} hoje • +{d.gain} {d.attr.replace('attr_','')}</div>
                    </div>
                  </div>
                )
              })}
            </div>
            {activeDrill && (
              <Card>
                <CardTitle>Treino de {activeDrill.name}</CardTitle>
                <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:10,padding:16,textAlign:'center'}}>
                  <div style={{fontSize:12,color:'var(--txt2)',marginBottom:4}}>Clique quando o marcador estiver na zona verde!</div>
                  <div onClick={hitTarget} style={{width:'100%',height:16,background:'var(--bg3)',borderRadius:8,overflow:'hidden',position:'relative',margin:'12px 0',cursor:'pointer',border:'1px solid var(--border)'}}>
                    <div style={{position:'absolute',top:0,left:'37%',width:'26%',height:'100%',background:'var(--g)',opacity:.3,borderRadius:6}}/>
                    <div style={{position:'absolute',top:0,width:'12%',height:'100%',background:'var(--g)',borderRadius:6,left:`${markerPos}%`,boxShadow:'0 0 8px rgba(0,214,143,.5)'}}/>
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
              <CardTitle>Atributos pós treino</CardTitle>
              <AttrBar val={p?.attr_forca||62} label="Força"/>
              <AttrBar val={p?.attr_prec||70} label="Precisão"/>
              <AttrBar val={p?.attr_stam||55} label="Stamina"/>
              <AttrBar val={p?.attr_refl||48} label="Reflexo"/>
            </Card>
          </div>
        )}

        {page==='ranking' && (
          <div>
            <div style={{fontFamily:'var(--font)',fontSize:24,fontWeight:800,letterSpacing:1,textTransform:'uppercase',marginBottom:16}}>Rankings</div>
            <div style={{display:'flex',gap:2,background:'var(--bg2)',padding:3,borderRadius:8,width:'fit-content',marginBottom:14,border:'1px solid var(--border)'}}>
              {(['hora','rodada','temp'] as const).map(t => (
                <div key={t} onClick={() => setRankTab(t)} style={{padding:'6px 14px',borderRadius:6,fontFamily:'var(--font)',fontSize:11,cursor:'pointer',
                  background:rankTab===t?'var(--g)':'transparent',color:rankTab===t?'#000':'var(--txt2)',
                  fontWeight:700,letterSpacing:'.5px',textTransform:'uppercase',transition:'all .13s'}}>
                  {t==='hora'?'Hora':t==='rodada'?'Rodada':'Temporada'}
                </div>
              ))}
            </div>
            <Card>
              <CardTitle>Top — {rankTab==='hora'?'hora atual':rankTab==='rodada'?'rodada':'temporada'}</CardTitle>
              {rankList.map((r,i) => {
                const isMe = r.username === p?.username
                const val = rankTab==='hora' ? r.goals_today : r.goals_season
                const rTeam = TEAMS.find(t => t.id === r.team || t.name === r.team) || TEAMS[0]
                return (
                  <div key={r.username} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid var(--border)',background:isMe?'rgba(0,214,143,.05)':'transparent'}}>
                    <span style={{width:22,fontFamily:'var(--font)',fontSize:13,fontWeight:700,color:i<3?'var(--amber)':'var(--txt2)',textAlign:'center'}}>{i+1}</span>
                    <MiniShirt primary={rTeam.primary} secondary={rTeam.secondary} size={24}/>
                    <span style={{flex:1,fontSize:13,fontFamily:'var(--font)',fontWeight:isMe?700:500,letterSpacing:'.3px',color:isMe?'var(--g)':'var(--txt)'}}>
                      {r.username}{isMe?' ★':''}
                    </span>
                    <span style={{fontFamily:'var(--font)',fontSize:14,fontWeight:700,color:'var(--g)'}}>{val?.toLocaleString()}</span>
                  </div>
                )
              })}
              {rankList.length === 0 && <div style={{fontSize:12,color:'var(--txt3)',textAlign:'center',padding:20}}>Nenhum dado ainda. Jogue uma partida!</div>}
            </Card>
          </div>
        )}

        {page==='shop' && (
          <div>
            <div style={{fontFamily:'var(--font)',fontSize:24,fontWeight:800,letterSpacing:1,textTransform:'uppercase',marginBottom:6}}>Loja</div>
            <div style={{fontSize:13,color:'var(--txt2)',marginBottom:14}}>Saldo: <strong style={{color:'var(--g)'}}>{(p?.money||0).toLocaleString()} reais</strong></div>
            <div style={{display:'flex',gap:2,background:'var(--bg2)',padding:3,borderRadius:8,width:'fit-content',marginBottom:14,border:'1px solid var(--border)'}}>
              {(['chuteiras','itens','clube'] as const).map(t => (
                <div key={t} onClick={() => setShopTab(t)} style={{padding:'6px 14px',borderRadius:6,fontFamily:'var(--font)',fontSize:11,cursor:'pointer',
                  background:shopTab===t?'var(--g)':'transparent',color:shopTab===t?'#000':'var(--txt2)',
                  fontWeight:700,letterSpacing:'.5px',textTransform:'uppercase',transition:'all .13s'}}>
                  {t.charAt(0).toUpperCase()+t.slice(1)}
                </div>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10}}>
              {(shopTab==='chuteiras'?BOOTS:shopTab==='itens'?ITEMS:CLUBE_ITEMS).map((item:any) => (
                <div key={item.name} style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:12,padding:14,textAlign:'center'}}>
                  <div style={{fontSize:26,color:'var(--g)',marginBottom:6}}><i className={`ti ${item.icon||'ti-shoe'}`}/></div>
                  <div style={{fontFamily:'var(--font)',fontSize:13,fontWeight:700,letterSpacing:'.5px',textTransform:'uppercase',marginBottom:3}}>{item.name}</div>
                  {item.tier && <div style={{fontSize:9,color:'var(--txt2)',marginBottom:4,fontFamily:'var(--font)',letterSpacing:'.5px',textTransform:'uppercase'}}>{item.tier}</div>}
                  <div style={{fontSize:11,color:'var(--g)',marginBottom:8}}>{item.bonus||item.desc}</div>
                  <div style={{fontSize:11,color:'var(--txt2)',marginBottom:10}}>{item.price}</div>
                  <Btn primary onClick={() => notify(`${item.name} comprado!`)} style={{width:'100%',justifyContent:'center',fontSize:11}}>Comprar</Btn>
                </div>
              ))}
            </div>
          </div>
        )}

        {page==='calendar' && (
          <div>
            <div style={{fontFamily:'var(--font)',fontSize:24,fontWeight:800,letterSpacing:1,textTransform:'uppercase',marginBottom:16}}>Calendário</div>
            <Card>
              <CardTitle>Junho 2026 — todos os jogos às 23:00 Londres</CardTitle>
              <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3,marginBottom:6}}>
                {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => (
                  <div key={d} style={{textAlign:'center',fontSize:9,color:'var(--txt3)',padding:3,fontFamily:'var(--font)',fontWeight:700,letterSpacing:'.5px',textTransform:'uppercase'}}>{d}</div>
                ))}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3}}>
                {Array.from({length:30},(_,i)=>i+1).map(d => {
                  // June 2026: 1=Mon, so Tue=3,10,17,24 and Sat=7,14,21,28
                  const isMatch = [3,7,10,14,17,21,24,28].includes(d)
                  const isToday = d===2
                  return (
                    <div key={d} onClick={() => isMatch && notify(`Partida dia ${d}/06 às 23:00 Londres!`)}
                      style={{aspectRatio:'1',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                        borderRadius:8,fontSize:11,
                        border:`${isToday?'2px':'1px'} solid ${isToday?'var(--g)':isMatch?'rgba(0,214,143,.4)':'rgba(59,130,246,.25)'}`,
                        background:isMatch?'rgba(0,214,143,.12)':'rgba(59,130,246,.08)',
                        color:isMatch?'var(--g)':'#60A5FA',fontFamily:'var(--font)',fontWeight:600,
                        cursor:isMatch?'pointer':'default'}}>
                      <span style={{fontSize:12,fontWeight:700}}>{d}</span>
                      <span style={{fontSize:9}}>{isMatch?'⚽':'🏃'}</span>
                    </div>
                  )
                })}
              </div>
              <div style={{display:'flex',gap:16,marginTop:12,fontSize:10,color:'var(--txt2)',fontFamily:'var(--font)',fontWeight:600,textTransform:'uppercase',letterSpacing:'.5px'}}>
                <span><span style={{display:'inline-block',width:10,height:10,background:'rgba(0,214,143,.2)',borderRadius:2,marginRight:4}}/>Partida</span>
                <span><span style={{display:'inline-block',width:10,height:10,background:'rgba(59,130,246,.15)',borderRadius:2,marginRight:4}}/>Drill</span>
              </div>
            </Card>
            <Card>
              <CardTitle>Times do Brasileirão 2026</CardTitle>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(80px,1fr))',gap:8}}>
                {TEAMS.map(t => (
                  <div key={t.id} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,padding:'8px 4px',borderRadius:8,background:'var(--bg2)',border:'1px solid var(--border)'}}>
                    <MiniShirt primary={t.primary} secondary={t.secondary} size={32}/>
                    <span style={{fontFamily:'var(--font)',fontSize:9,fontWeight:700,letterSpacing:'.3px',textAlign:'center',color:'var(--txt2)'}}>{t.abbr}</span>
                    <span style={{fontSize:9,color:'var(--txt3)',textAlign:'center'}}>{t.city}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {page==='profile' && (
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
                      {playerTeam && <MiniShirt primary={playerTeam.primary} secondary={playerTeam.secondary} size={20}/>}
                      <span style={{fontSize:11,color:'var(--g)'}}>{playerTeam?.name}</span>
                    </div>
                  </div>
                </div>
                <div style={{height:1,background:'var(--border)',margin:'10px 0'}}/>
                {[
                  {lbl:'Gols temporada',val:p?.goals_season||0},
                  {lbl:'Aproveitamento',val:`${(p?.acertos||0)+(p?.erros||0)>0?Math.round(((p?.acertos||0)/((p?.acertos||0)+(p?.erros||0)))*100):0}%`},
                  {lbl:'Dinheiro',val:`R$ ${(p?.money||0).toLocaleString()}`},
                ].map(r => (
                  <div key={r.lbl} style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:8}}>
                    <span style={{color:'var(--txt2)'}}>{r.lbl}</span>
                    <strong style={{fontFamily:'var(--font)',fontSize:14}}>{r.val}</strong>
                  </div>
                ))}
              </Card>
              <Card>
                <CardTitle>Atributos</CardTitle>
                <AttrBar val={p?.attr_forca||62} label="Força"/>
                <AttrBar val={p?.attr_prec||70} label="Precisão"/>
                <AttrBar val={p?.attr_stam||55} label="Stamina"/>
                <AttrBar val={p?.attr_refl||48} label="Reflexo"/>
                <div style={{height:1,background:'var(--border)',margin:'10px 0'}}/>
                <CardTitle>Chuteira</CardTitle>
                <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px',background:'var(--bg2)',borderRadius:8,border:'1px solid var(--border)'}}>
                  <i className="ti ti-shoe" style={{fontSize:22,color:'var(--g)'}}/>
                  <div><div style={{fontFamily:'var(--font)',fontSize:13,fontWeight:700,textTransform:'uppercase',letterSpacing:'.5px'}}>Nenhuma</div><div style={{fontSize:10,color:'var(--txt2)'}}>Compre na loja</div></div>
                </div>
              </Card>
            </div>
          </div>
        )}

      </div>

      {notifMsg && (
        <div style={{position:'fixed',top:16,right:16,background:'var(--g)',color:'#000',padding:'10px 18px',borderRadius:8,fontFamily:'var(--font)',fontSize:13,fontWeight:800,letterSpacing:'.5px',textTransform:'uppercase',boxShadow:'0 4px 20px rgba(0,214,143,.3)',zIndex:9999}}>
          {notifMsg}
        </div>
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(.7)}}`}</style>
    </div>
  )
}
