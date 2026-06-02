'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, type Profile } from '@/lib/supabase'

// ─── TYPES ───────────────────────────────────────────
type Page = 'home'|'match'|'drills'|'ranking'|'shop'|'calendar'|'profile'
type RankEntry = { username: string; team: string; goals_season: number; goals_today: number; position: number }

const RANK_POOL = [
  {username:'portuguesa27',team:'POR',goals_season:1841,goals_today:67,position:0},
  {username:'dacosta',team:'FIG',goals_season:1669,goals_today:55,position:0},
  {username:'ZeHeTmeTeR',team:'INT',goals_season:1624,goals_today:61,position:0},
  {username:'VicioJau',team:'CAM',goals_season:1617,goals_today:58,position:0},
  {username:'Navas',team:'SPC',goals_season:1566,goals_today:52,position:0},
  {username:'DGC3MUSIC',team:'FLA',goals_season:1551,goals_today:49,position:0},
  {username:'caio2',team:'COR',goals_season:1538,goals_today:44,position:0},
  {username:'MafiaLavante',team:'BOT',goals_season:1484,goals_today:38,position:0},
  {username:'AFEGANSITO',team:'GRE',goals_season:1463,goals_today:35,position:0},
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

// ─── HELPERS ─────────────────────────────────────────
function fmtTimer(s: number) {
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60
  return `${h>0?h+':':''}${m<10&&h>0?'0':''}${m}:${sec<10?'0':''}${sec}`
}
function pick(arr: string[]) { return arr[Math.floor(Math.random()*arr.length)] }

// ─── MAIN COMPONENT ──────────────────────────────────
export default function FutmApp() {
  // Auth
  const [authMode, setAuthMode] = useState<'login'|'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [team, setTeam] = useState('')
  const [authErr, setAuthErr] = useState('')
  const [loading, setLoading] = useState(false)

  // App state
  const [loggedIn, setLoggedIn] = useState(false)
  const [profile, setProfile] = useState<Profile|null>(null)
  const [page, setPage] = useState<Page>('home')
  const [notifMsg, setNotifMsg] = useState('')
  const [rankTab, setRankTab] = useState<'hora'|'rodada'|'temp'>('hora')
  const [shopTab, setShopTab] = useState<'chuteiras'|'itens'|'clube'>('chuteiras')

  // Match
  const [matchRunning, setMatchRunning] = useState(false)
  const [matchTime, setMatchTime] = useState(5400)
  const [matchPhase, setMatchPhase] = useState('Aguardando início')
  const [scoreH, setScoreH] = useState(0)
  const [scoreA, setScoreA] = useState(0)
  const [acertos, setAcertos] = useState(0)
  const [erros, setErros] = useState(0)
  const [feed, setFeed] = useState<{msg:string,cls:string}[]>([{msg:'Aguardando início...',cls:''}])
  const [cooldowns, setCooldowns] = useState({penalti:0,falta:0,auto:0,escanteio:0})
  const matchRef = useRef<ReturnType<typeof setInterval>|null>(null)
  const cdRef = useRef({penalti:0,falta:0,auto:0,escanteio:0})

  // Drills
  const [drillsDone, setDrillsDone] = useState<string[]>([])
  const [activeDrill, setActiveDrill] = useState<typeof DRILL_DEFS[0]|null>(null)
  const [drillRounds, setDrillRounds] = useState(0)
  const [drillScore, setDrillScore] = useState(0)
  const [drillResult, setDrillResult] = useState('')
  const [markerPos, setMarkerPos] = useState(0)
  const markerRef = useRef({pos:0,dir:1,animId:0})

  // Ranking
  const [rankList, setRankList] = useState<RankEntry[]>([])

  // ─── NOTIFY ───
  const notify = useCallback((msg: string) => {
    setNotifMsg(msg)
    setTimeout(() => setNotifMsg(''), 2400)
  }, [])

  // ─── AUTH ───
  async function doLogin() {
    setAuthErr(''); setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { setAuthErr('Email ou senha incorretos'); return }
  }

  async function doRegister() {
    setAuthErr('')
    if (!username.trim() || !email.trim() || !password || !team.trim()) {
      setAuthErr('Preencha todos os campos'); return
    }
    // Check username unique
    const { data: exists } = await supabase.from('profiles').select('id').eq('username', username.trim()).maybeSingle()
    if (exists) { setAuthErr('Usuário já existe'); return }
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { username: username.trim(), team: team.trim() } }
    })
    setLoading(false)
    if (error) { setAuthErr(error.message); return }
    notify('Conta criada! Verifique seu email se necessário.')
  }

  async function doLogout() {
    await supabase.auth.signOut()
    setLoggedIn(false); setProfile(null)
  }

  // ─── SESSION ───
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) loadProfile(session.user.id)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) loadProfile(session.user.id)
      else { setLoggedIn(false); setProfile(null) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (data) {
      setProfile(data as Profile)
      setDrillsDone(data.drills_done || [])
      setLoggedIn(true)
      loadRanking()
    }
  }

  async function saveProfile(updates: Partial<Profile>) {
    if (!profile) return
    const { data } = await supabase.from('profiles').update(updates).eq('id', profile.id).select().single()
    if (data) setProfile(data as Profile)
  }

  // ─── RANKING ───
  async function loadRanking() {
    const { data } = await supabase.from('ranking_season').select('*')
    if (data && data.length > 0) {
      setRankList(data as RankEntry[])
    } else {
      // fallback demo data
      setRankList(RANK_POOL.map((p,i) => ({...p, position: i+1})))
    }
  }

  // ─── MATCH ───
  function startMatch() {
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
      if (t === 2700) { setMatchPhase('Intervalo'); addFeedItem('Intervalo! Descanse.','f') }
      if (t === 2400) { setMatchPhase('2º Tempo'); addFeedItem('2º Tempo! Ritmo aumentou.','') }
      if (t <= 0) {
        if (matchRef.current) clearInterval(matchRef.current)
        setMatchRunning(false)
        setMatchPhase('Fim')
        setScoreH(h => { setScoreA(a => {
          const r = h>a?'Vitória!':h<a?'Derrota.':'Empate.'
          addFeedItem('Apito final! '+r+' Placar: '+h+' × '+a, h>=a?'g':'m')
          return a
        }); return h })
        setCooldowns({penalti:0,falta:0,auto:0,escanteio:0})
        return 0
      }
      // adversary scores
      if (Math.random() < 0.022) {
        setScoreA(a => { addFeedItem('Gol do adversário!','m'); return a+1 })
      }
      // tick cooldowns
      cdRef.current = {
        penalti: Math.max(0, cdRef.current.penalti-1),
        falta: Math.max(0, cdRef.current.falta-1),
        auto: Math.max(0, cdRef.current.auto-1),
        escanteio: Math.max(0, cdRef.current.escanteio-1),
      }
      setCooldowns({...cdRef.current})
      return t
    })
  }, [])

  function addFeedItem(msg: string, cls: string) {
    setFeed(prev => [{msg,cls}, ...prev].slice(0,20))
  }

  async function doShoot(type: 'penalti'|'falta'|'auto'|'escanteio') {
    if (!matchRunning || cdRef.current[type] > 0 || !profile) return
    const acc = Math.min(95, profile.attr_prec + profile.attr_refl * 0.1)
    const hit = Math.random()*100 < acc
    const cds = {penalti:29,falta:44,auto:59,escanteio:89}
    cdRef.current[type] = cds[type]
    setCooldowns({...cdRef.current})
    if (hit) {
      setAcertos(a => a+1)
      setScoreH(h => h+1)
      addFeedItem(pick(SHOOT_MSGS.hit),'g')
      const newGoals = profile.goals_today + 1
      const newSeason = profile.goals_season + 1
      const updated = { goals_today: newGoals, goals_season: newSeason, acertos: profile.acertos+1 }
      setProfile(p => p ? {...p, ...updated} : p)
      await saveProfile(updated)
      loadRanking()
    } else {
      setErros(e => e+1)
      addFeedItem(pick(SHOOT_MSGS.miss),'m')
      await saveProfile({ erros: profile.erros+1 })
    }
  }

  // ─── DRILLS ───
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

  function openDrill(d: typeof DRILL_DEFS[0]) {
    setActiveDrill(d); setDrillRounds(0); setDrillScore(0); setDrillResult('')
    if (profile) startMarker(profile.attr_refl)
  }

  function closeDrill() {
    cancelAnimationFrame(markerRef.current.animId)
    setActiveDrill(null)
  }

  async function hitTarget() {
    if (drillRounds >= 5 || !activeDrill || !profile) return
    const hit = markerPos >= 37 && markerPos <= 63
    const near = markerPos >= 25 && markerPos <= 75
    const newRounds = drillRounds + 1
    const pts = hit ? 2 : near ? 1 : 0
    const newScore = drillScore + pts
    setDrillRounds(newRounds)
    setDrillScore(newScore)
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
      setProfile(p => p ? {...p, ...updates} : p)
      await saveProfile(updates)
      setTimeout(() => setActiveDrill(null), 1200)
    }
  }

  // ─── RENDER HELPERS ───
  const p = profile

  function AttrBar({val, label}: {val:number, label:string}) {
    return (
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
        <span style={{fontFamily:'var(--font)',fontSize:11,color:'var(--txt2)',width:70,flexShrink:0,textTransform:'uppercase',letterSpacing:'.5px',fontWeight:600}}>{label}</span>
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
        display:'inline-flex',alignItems:'center',gap:6,padding:'8px 14px',
        borderRadius:8,fontSize:12,cursor:disabled?'not-allowed':'pointer',
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

  // ─── LOGIN SCREEN ───
  if (!loggedIn) return (
    <div style={{position:'fixed',inset:0,background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center',
      backgroundImage:'radial-gradient(ellipse at 20% 50%,rgba(0,214,143,.06) 0%,transparent 60%),radial-gradient(ellipse at 80% 20%,rgba(0,168,107,.04) 0%,transparent 50%)'}}>
      <div style={{width:360,background:'var(--card)',border:'1px solid var(--border2)',borderRadius:16,padding:36,position:'relative',overflow:'hidden'}}>
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
            <div style={{marginBottom:12}}>
              <label style={{fontSize:10,color:'var(--txt2)',display:'block',marginBottom:5,letterSpacing:'.8px',textTransform:'uppercase',fontFamily:'var(--font)',fontWeight:600}}>Email</label>
              <input value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doLogin()} placeholder="seu@email.com"
                style={{width:'100%',padding:'10px 12px',borderRadius:8,border:'1px solid var(--border)',background:'var(--bg2)',color:'var(--txt)',fontSize:14,outline:'none'}}/>
            </div>
            <div style={{marginBottom:12}}>
              <label style={{fontSize:10,color:'var(--txt2)',display:'block',marginBottom:5,letterSpacing:'.8px',textTransform:'uppercase',fontFamily:'var(--font)',fontWeight:600}}>Senha</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doLogin()} placeholder="••••••"
                style={{width:'100%',padding:'10px 12px',borderRadius:8,border:'1px solid var(--border)',background:'var(--bg2)',color:'var(--txt)',fontSize:14,outline:'none'}}/>
            </div>
          </>
        ) : (
          <>
            {[{label:'Usuário',val:username,set:setUsername,ph:'seu nick'},{label:'Email',val:email,set:setEmail,ph:'seu@email.com'},{label:'Senha',val:password,set:setPassword,ph:'••••••',type:'password'},{label:'Seu time',val:team,set:setTeam,ph:'ex: Vila Nova, Flamengo...'}].map(f => (
              <div key={f.label} style={{marginBottom:12}}>
                <label style={{fontSize:10,color:'var(--txt2)',display:'block',marginBottom:5,letterSpacing:'.8px',textTransform:'uppercase',fontFamily:'var(--font)',fontWeight:600}}>{f.label}</label>
                <input type={(f as any).type||'text'} value={f.val} onChange={e=>f.set(e.target.value)} placeholder={f.ph}
                  style={{width:'100%',padding:'10px 12px',borderRadius:8,border:'1px solid var(--border)',background:'var(--bg2)',color:'var(--txt)',fontSize:14,outline:'none'}}/>
              </div>
            ))}
          </>
        )}
        {authErr && <div style={{fontSize:12,color:'var(--red)',marginBottom:8,textAlign:'center'}}>{authErr}</div>}
        <Btn primary onClick={authMode==='login'?doLogin:doRegister} disabled={loading} style={{width:'100%',justifyContent:'center'}}>
          {loading ? '...' : authMode==='login' ? 'Entrar' : 'Criar conta'}
        </Btn>
        <div style={{marginTop:14,fontSize:11,color:'var(--txt3)',textAlign:'center'}}>
          {authMode==='login' ? 'Não tem conta? ' : 'Já tem conta? '}
          <span onClick={() => {setAuthMode(authMode==='login'?'register':'login');setAuthErr('')}} style={{color:'var(--g)',cursor:'pointer'}}>
            {authMode==='login' ? 'Cadastre-se' : 'Entrar'}
          </span>
        </div>
      </div>
    </div>
  )

  // ─── APP ───
  const navItems: {id:Page, icon:string, label:string}[] = [
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
      {/* SIDEBAR */}
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
                borderLeft:page===id?'2px solid var(--g)':'2px solid transparent',
                transition:'all .12s'}}>
              <i className={`ti ${icon}`}/>
              {label}
            </div>
          ))}
        </div>
        <div style={{padding:'14px 16px',borderTop:'1px solid var(--border)',marginTop:'auto'}}>
          <div style={{fontFamily:'var(--font)',fontSize:15,fontWeight:700,letterSpacing:'.5px',textTransform:'uppercase'}}>{p?.username}</div>
          <div style={{fontSize:11,color:'var(--g)',marginTop:1}}>{p?.team}</div>
          <button onClick={doLogout} style={{marginTop:10,display:'flex',alignItems:'center',gap:6,padding:'5px 10px',borderRadius:8,fontSize:11,cursor:'pointer',border:'1px solid var(--border2)',background:'var(--card2)',color:'var(--txt2)',fontFamily:'var(--font)',fontWeight:600,letterSpacing:'.5px',textTransform:'uppercase'}}>
            <i className="ti ti-logout"/> Sair
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div style={{flex:1,overflowY:'auto',padding:20,background:'var(--bg)'}}>

        {/* ── HOME ── */}
        {page==='home' && (
          <div>
            <div style={{fontFamily:'var(--font)',fontSize:24,fontWeight:800,letterSpacing:1,textTransform:'uppercase',marginBottom:16}}>Início</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:12}}>
              {[
                {lbl:'Gols hoje',val:p?.goals_today||0,cls:'var(--g)'},
                {lbl:'Temporada',val:p?.goals_season||0,cls:'var(--txt)'},
                {lbl:'Dinheiro',val:`${Math.floor((p?.money||0)/1000)}k`,cls:'var(--txt)'},
                {lbl:'Próx. partida',val:'Ter',cls:'var(--amber)'},
              ].map(s => (
                <div key={s.lbl} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:10,padding:'12px'}}>
                  <div style={{fontFamily:'var(--font)',fontSize:9,color:'var(--txt2)',letterSpacing:'.8px',textTransform:'uppercase',marginBottom:4}}>{s.lbl}</div>
                  <div style={{fontFamily:'var(--font)',fontSize:24,fontWeight:800,letterSpacing:1,color:s.cls}}>{s.val}</div>
                </div>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <Card>
                <div style={{fontFamily:'var(--font)',fontSize:11,fontWeight:700,color:'var(--txt2)',marginBottom:12,letterSpacing:1,textTransform:'uppercase'}}>Missões ativas</div>
                {[
                  {label:'50 gols na rodada',cur:p?.goals_today||0,max:50},
                  {label:'5 drills esta semana',cur:drillsDone.length,max:5},
                  {label:'Vencer um desafio',cur:0,max:1},
                ].map(m => (
                  <div key={m.label} style={{marginBottom:10}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}>
                      <span>{m.label}</span>
                      <span style={{color:'var(--txt2)'}}>{Math.min(m.cur,m.max)}/{m.max}</span>
                    </div>
                    <div style={{height:5,background:'var(--bg2)',borderRadius:3,overflow:'hidden'}}>
                      <div style={{height:'100%',borderRadius:3,background:'var(--g)',width:`${Math.min(100,Math.round((m.cur/m.max)*100))}%`,transition:'width .3s'}}/>
                    </div>
                  </div>
                ))}
              </Card>
              <Card>
                <div style={{fontFamily:'var(--font)',fontSize:11,fontWeight:700,color:'var(--txt2)',marginBottom:12,letterSpacing:1,textTransform:'uppercase'}}>Atributos</div>
                <AttrBar val={p?.attr_forca||62} label="Força"/>
                <AttrBar val={p?.attr_prec||70} label="Precisão"/>
                <AttrBar val={p?.attr_stam||55} label="Stamina"/>
                <AttrBar val={p?.attr_refl||48} label="Reflexo"/>
              </Card>
            </div>
          </div>
        )}

        {/* ── MATCH ── */}
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
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:5,flex:1}}>
                  <div style={{width:40,height:40,borderRadius:'50%',background:'rgba(0,214,143,.15)',border:'2px solid rgba(0,214,143,.3)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font)',fontSize:12,fontWeight:700,letterSpacing:'.5px'}}>
                    {p?.username?.substring(0,2).toUpperCase()}
                  </div>
                  <div style={{fontFamily:'var(--font)',fontSize:12,fontWeight:700,letterSpacing:'.5px',textTransform:'uppercase'}}>{p?.team}</div>
                  <div style={{fontFamily:'var(--font)',fontSize:48,fontWeight:800,lineHeight:1,letterSpacing:2,color:'var(--g)'}}>{scoreH}</div>
                </div>
                <div style={{fontFamily:'var(--font)',fontSize:13,color:'var(--txt3)',fontWeight:700,letterSpacing:2}}>VS</div>
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:5,flex:1}}>
                  <div style={{width:40,height:40,borderRadius:'50%',background:'rgba(255,71,87,.15)',border:'2px solid rgba(255,71,87,.3)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font)',fontSize:12,fontWeight:700,color:'var(--red)'}}>FLA</div>
                  <div style={{fontFamily:'var(--font)',fontSize:12,fontWeight:700,letterSpacing:'.5px',textTransform:'uppercase'}}>Flamengo</div>
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
                  {type:'penalti',label:'Pênalti',icon:'ti-ball-football',cd:29},
                  {type:'falta',label:'Falta',icon:'ti-arrow-curve-right',cd:44},
                  {type:'auto',label:'Drible',icon:'ti-player-play',cd:59},
                  {type:'escanteio',label:'Escanteio',icon:'ti-corner-up-right',cd:89},
                ] as const).map(({type,label,icon}) => {
                  const cd = cooldowns[type]
                  const disabled = !matchRunning || cd > 0
                  return (
                    <button key={type} onClick={() => doShoot(type)} disabled={disabled}
                      style={{padding:'14px 0',borderRadius:10,cursor:disabled?'not-allowed':'pointer',
                        border:`1px solid ${!disabled?'var(--g)':'var(--border)'}`,
                        background:'var(--bg2)',color:'var(--txt)',
                        display:'flex',flexDirection:'column',alignItems:'center',gap:4,
                        opacity:disabled?.35:1,transition:'all .15s'}}>
                      <i className={`ti ${icon}`} style={{fontSize:22,color:!disabled?'var(--g)':'var(--txt3)'}}/>
                      <span style={{fontFamily:'var(--font)',fontSize:13,fontWeight:700,letterSpacing:'.5px',textTransform:'uppercase'}}>{label}</span>
                      <span style={{fontSize:10,color:'var(--txt3)',fontFamily:'var(--font)',letterSpacing:'.5px'}}>
                        {cd > 0 ? `${cd}s` : matchRunning ? 'pronto' : 'aguarde'}
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
              <div style={{fontFamily:'var(--font)',fontSize:11,fontWeight:700,color:'var(--txt2)',marginBottom:10,letterSpacing:1,textTransform:'uppercase'}}>Feed</div>
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

        {/* ── DRILLS ── */}
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
                      cursor:done?'default':'pointer',transition:'all .15s',textAlign:'center',overflow:'hidden',
                      opacity:done?.5:1}}>
                    <div style={{height:60,background:'var(--bg2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <i className="ti ti-ball-football" style={{fontSize:28,color:done?'var(--txt3)':'var(--g)'}}/>
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
                <div style={{fontFamily:'var(--font)',fontSize:11,fontWeight:700,color:'var(--txt2)',marginBottom:10,letterSpacing:1,textTransform:'uppercase'}}>Treino de {activeDrill.name}</div>
                <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:10,padding:16,textAlign:'center'}}>
                  <div style={{fontSize:12,color:'var(--txt2)',marginBottom:4}}>Clique quando o marcador estiver na zona verde!</div>
                  <div onClick={hitTarget} style={{width:'100%',height:16,background:'var(--bg3)',borderRadius:8,overflow:'hidden',position:'relative',margin:'12px 0',cursor:'pointer',border:'1px solid var(--border)'}}>
                    <div style={{position:'absolute',top:0,left:'37%',width:'26%',height:'100%',background:'var(--g)',opacity:.3,borderRadius:6}}/>
                    <div style={{position:'absolute',top:0,width:'12%',height:'100%',background:'var(--g)',borderRadius:6,left:`${markerPos}%`,boxShadow:'0 0 8px rgba(0,214,143,.5)',transition:'none'}}/>
                  </div>
                  <div style={{fontFamily:'var(--font)',fontSize:20,fontWeight:800,letterSpacing:1,minHeight:28,margin:'6px 0',
                    color:drillResult.includes('PERFEITO')?'var(--g)':drillResult.includes('BOM')?'var(--amber)':drillResult.includes('ERROU')?'var(--red)':drillResult.includes('CONCLUÍDO')?'var(--g)':'var(--txt)'}}>
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
              <div style={{fontFamily:'var(--font)',fontSize:11,fontWeight:700,color:'var(--txt2)',marginBottom:12,letterSpacing:1,textTransform:'uppercase'}}>Atributos pós treino</div>
              <AttrBar val={p?.attr_forca||62} label="Força"/>
              <AttrBar val={p?.attr_prec||70} label="Precisão"/>
              <AttrBar val={p?.attr_stam||55} label="Stamina"/>
              <AttrBar val={p?.attr_refl||48} label="Reflexo"/>
            </Card>
          </div>
        )}

        {/* ── RANKING ── */}
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
              <div style={{fontFamily:'var(--font)',fontSize:11,fontWeight:700,color:'var(--txt2)',marginBottom:12,letterSpacing:1,textTransform:'uppercase'}}>
                Top — {rankTab==='hora'?'hora atual':rankTab==='rodada'?'rodada':'temporada'}
              </div>
              {rankList.length === 0
                ? RANK_POOL.map((r,i) => (
                  <div key={r.username} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
                    <span style={{width:22,fontFamily:'var(--font)',fontSize:13,fontWeight:700,color:i<3?'var(--amber)':'var(--txt2)',textAlign:'center'}}>{i+1}</span>
                    <div style={{width:26,height:26,borderRadius:'50%',background:'var(--bg2)',border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font)',fontSize:9,color:'var(--txt2)'}}>{r.team}</div>
                    <span style={{flex:1,fontSize:13,fontFamily:'var(--font)',fontWeight:500,letterSpacing:'.3px'}}>{r.username}</span>
                    <span style={{fontFamily:'var(--font)',fontSize:14,fontWeight:700,color:'var(--g)'}}>{r.goals_season.toLocaleString()}</span>
                  </div>
                ))
                : rankList.map((r,i) => {
                  const isMe = r.username === p?.username
                  const val = rankTab==='hora' ? r.goals_today : r.goals_season
                  return (
                    <div key={r.username} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid var(--border)',background:isMe?'rgba(0,214,143,.05)':'transparent'}}>
                      <span style={{width:22,fontFamily:'var(--font)',fontSize:13,fontWeight:700,color:i<3?'var(--amber)':'var(--txt2)',textAlign:'center'}}>{i+1}</span>
                      <div style={{width:26,height:26,borderRadius:'50%',background:'var(--bg2)',border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font)',fontSize:9,color:'var(--txt2)'}}>{r.team?.substring(0,3).toUpperCase()}</div>
                      <span style={{flex:1,fontSize:13,fontFamily:'var(--font)',fontWeight:isMe?700:500,letterSpacing:'.3px',color:isMe?'var(--g)':'var(--txt)'}}>
                        {r.username}{isMe?' ★':''}
                      </span>
                      <span style={{fontFamily:'var(--font)',fontSize:14,fontWeight:700,color:'var(--g)'}}>{val?.toLocaleString()}</span>
                    </div>
                  )
                })
              }
            </Card>
          </div>
        )}

        {/* ── SHOP ── */}
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
                  <div style={{fontSize:26,color:'var(--g)',marginBottom:6}}>
                    <i className={`ti ${item.icon||'ti-shoe'}`}/>
                  </div>
                  <div style={{fontFamily:'var(--font)',fontSize:13,fontWeight:700,letterSpacing:'.5px',textTransform:'uppercase',marginBottom:3}}>{item.name}</div>
                  {item.tier && <div style={{fontSize:9,color:'var(--txt2)',marginBottom:4,fontFamily:'var(--font)',letterSpacing:'.5px',textTransform:'uppercase'}}>{item.tier}</div>}
                  <div style={{fontSize:11,color:'var(--g)',marginBottom:8}}>{item.bonus||item.desc}</div>
                  <div style={{fontSize:11,color:'var(--txt2)',marginBottom:10}}>{item.price}{item.price?.includes('dias')?'':' • 30 dias'}</div>
                  <Btn primary onClick={() => notify(`${item.name} comprado!`)} style={{width:'100%',justifyContent:'center',fontSize:11}}>Comprar</Btn>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CALENDAR ── */}
        {page==='calendar' && (
          <div>
            <div style={{fontFamily:'var(--font)',fontSize:24,fontWeight:800,letterSpacing:1,textTransform:'uppercase',marginBottom:16}}>Calendário</div>
            <Card>
              <div style={{fontFamily:'var(--font)',fontSize:11,fontWeight:700,color:'var(--txt2)',marginBottom:12,letterSpacing:1,textTransform:'uppercase'}}>Junho 2026 — Rodada 1</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3,marginBottom:6}}>
                {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => (
                  <div key={d} style={{textAlign:'center',fontSize:9,color:'var(--txt3)',padding:3,fontFamily:'var(--font)',fontWeight:700,letterSpacing:'.5px',textTransform:'uppercase'}}>{d}</div>
                ))}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3}}>
                {Array.from({length:30},(_,i)=>i+1).map(d => {
                  const isMatch = [3,7,10,14,17,21,24,28].includes(d)
                  const isToday = d===2
                  return (
                    <div key={d} onClick={() => isMatch && notify(`Partida dia ${d}/06 às 20:00!`)}
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
                <span><span style={{display:'inline-block',width:10,height:10,border:'2px solid var(--g)',borderRadius:2,marginRight:4}}/>Hoje</span>
              </div>
            </Card>
          </div>
        )}

        {/* ── PROFILE ── */}
        {page==='profile' && (
          <div>
            <div style={{fontFamily:'var(--font)',fontSize:24,fontWeight:800,letterSpacing:1,textTransform:'uppercase',marginBottom:16}}>Perfil</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <Card>
                <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
                  <div style={{width:50,height:50,borderRadius:'50%',background:'rgba(0,214,143,.15)',border:'2px solid rgba(0,214,143,.3)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font)',fontSize:16,fontWeight:800,letterSpacing:1,color:'var(--g)'}}>
                    {p?.username?.substring(0,2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{fontFamily:'var(--font)',fontSize:16,fontWeight:800,letterSpacing:1,textTransform:'uppercase'}}>{p?.username}</div>
                    <div style={{fontSize:11,color:'var(--g)',marginTop:1}}>{p?.team}</div>
                    <Badge variant="g" >Nível 1</Badge>
                  </div>
                </div>
                <div style={{height:1,background:'var(--border)',margin:'10px 0'}}/>
                {[
                  {lbl:'Gols temporada',val:p?.goals_season||0},
                  {lbl:'Aproveitamento',val:`${(p?.acertos||0)+(p?.erros||0)>0?Math.round(((p?.acertos||0)/((p?.acertos||0)+(p?.erros||0)))*100):0}%`},
                  {lbl:'Dinheiro',val:`R$ ${(p?.money||0).toLocaleString()}`},
                  {lbl:'VIP',val:p?.vip_days?`${p.vip_days} dias`:'Sem VIP'},
                ].map(r => (
                  <div key={r.lbl} style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:8}}>
                    <span style={{color:'var(--txt2)'}}>{r.lbl}</span>
                    <strong style={{fontFamily:'var(--font)',fontSize:14}}>{r.val}</strong>
                  </div>
                ))}
              </Card>
              <Card>
                <div style={{fontFamily:'var(--font)',fontSize:11,fontWeight:700,color:'var(--txt2)',marginBottom:12,letterSpacing:1,textTransform:'uppercase'}}>Títulos</div>
                {[
                  {icon:'ti-star',label:'Estadual',val:'0x',color:'var(--amber)'},
                  {icon:'ti-trophy',label:'Brasileiro',val:'0x',color:'var(--amber)'},
                  {icon:'ti-globe',label:'Mundial',val:'0x',color:'var(--g)'},
                ].map(t => (
                  <div key={t.label} style={{display:'flex',alignItems:'center',justifyContent:'space-between',fontSize:13,marginBottom:8}}>
                    <span><i className={`ti ${t.icon}`} style={{color:t.color,fontSize:14,marginRight:6}}/>{t.label}</span>
                    <Badge variant="gr">{t.val}</Badge>
                  </div>
                ))}
                <div style={{height:1,background:'var(--border)',margin:'10px 0'}}/>
                <div style={{fontFamily:'var(--font)',fontSize:11,fontWeight:700,color:'var(--txt2)',marginBottom:10,letterSpacing:1,textTransform:'uppercase'}}>Atributos</div>
                <AttrBar val={p?.attr_forca||62} label="Força"/>
                <AttrBar val={p?.attr_prec||70} label="Precisão"/>
                <AttrBar val={p?.attr_stam||55} label="Stamina"/>
                <AttrBar val={p?.attr_refl||48} label="Reflexo"/>
              </Card>
            </div>
          </div>
        )}

      </div>

      {/* NOTIF */}
      {notifMsg && (
        <div style={{position:'fixed',top:16,right:16,background:'var(--g)',color:'#000',padding:'10px 18px',
          borderRadius:8,fontFamily:'var(--font)',fontSize:13,fontWeight:800,letterSpacing:'.5px',textTransform:'uppercase',
          boxShadow:'0 4px 20px rgba(0,214,143,.3)',zIndex:9999}}>
          {notifMsg}
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.3;transform:scale(.7)} }
        button:hover:not(:disabled) { opacity: 0.85; }
      `}</style>
    </div>
  )
}
