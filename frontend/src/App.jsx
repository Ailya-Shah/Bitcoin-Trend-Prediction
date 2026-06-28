import { useState, useEffect } from 'react'
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, Cell
} from 'recharts'

const C = { ink:'#15171C', accent:'#F7931A', neg:'#C1432E', pos:'#1F8A74', slate:'#3D5A80', line:'#D6DAE0', soft:'#5C636D' }
const fmtYear = d => (d || '').slice(0, 4)
const pct = x => (x * 100).toFixed(1) + '%'

const SECTIONS = [
  ['Overview', 'overview'], ['The data', 'data'], ['Returns & risk', 'returns'],
  ['Models', 'models'], ['Backtest', 'backtest'], ['Method & honesty', 'method'],
]

function Tip({ active, payload, label, suffix='' }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{background:C.ink,color:'#fff',padding:'8px 11px',borderRadius:8,fontFamily:'IBM Plex Mono',fontSize:12}}>
      <div style={{color:'#8b929c',marginBottom:3}}>{label}</div>
      {payload.map((p,i)=>(<div key={i} style={{color:p.color||'#fff'}}>{p.name}: {typeof p.value==='number'?p.value.toLocaleString():p.value}{suffix}</div>))}
    </div>
  )
}

export default function App() {
  const [d, setD] = useState(null)
  const [tab, setTab] = useState('overview')
  const [err, setErr] = useState(null)

  useEffect(() => {
    fetch(import.meta.env.BASE_URL + 'data/dashboard.json')
      .then(r => r.json()).then(setD).catch(() => setErr(true))
  }, [])

  if (err) return <div style={{padding:40,fontFamily:'IBM Plex Mono'}}>Could not load dashboard.json. Run <b>python scripts/export_frontend_data.py</b> first.</div>
  if (!d) return <div style={{padding:40,fontFamily:'IBM Plex Mono',color:C.soft}}>Loading research…</div>

  return (
    <div className="app">
      <aside className="side">
        <div className="brand">
          <div className="tick">QUANTITATIVE RESEARCH</div>
          <h1>Bitcoin Trend Prediction</h1>
          <div className="sub">{d.meta.start} → {d.meta.end} · {d.meta.n_days.toLocaleString()} days</div>
        </div>
        <nav className="nav">
          {SECTIONS.map(([label, id], i) => (
            <button key={id} className={tab===id?'on':''} onClick={()=>{setTab(id);window.scrollTo(0,0)}}>
              <span className="n">{String(i).padStart(2,'0')}</span>{label}
            </button>
          ))}
        </nav>
        <div className="foot">9-notebook pipeline<br/>raw → clean → stats →<br/>GARCH → ML → neural net →<br/>backtest → verdict</div>
      </aside>

      <main className="main">
        {tab==='overview' && <Overview d={d} />}
        {tab==='data' && <DataSection d={d} />}
        {tab==='returns' && <Returns d={d} />}
        {tab==='models' && <Models d={d} />}
        {tab==='backtest' && <Backtest d={d} />}
        {tab==='method' && <Method d={d} />}
      </main>
    </div>
  )
}

function Overview({ d }) {
  const yrs = ((d.meta.n_days)/365).toFixed(1)
  return (
    <>
      <div className="hero">
        <div className="eyebrow">The honest headline</div>
        <div className="big">{(d.verdict.best_accuracy*100).toFixed(1)}<span className="unit">%</span></div>
        <div className="label">best next-day directional accuracy · {d.verdict.best_model}</div>
        <div style={{height:16}} />
        <div className="verdicttag">≈ A COIN FLIP</div>
        <p>Short-horizon Bitcoin direction is close to unpredictable — and this project is built to prove that honestly rather than fake a number. Every claim is tested against a baseline, the deep model is benchmarked fairly, and the trading edge is checked after costs.</p>
      </div>
      <div className="strip">
        <Metric v={yrs+' yr'} k="continuous daily history" />
        <Metric v={d.meta.n_days.toLocaleString()} k="trading days, zero gaps" />
        <Metric v={d.worst_drawdown+'%'} k="worst drawdown (2018)" cls="neg" />
        <Metric v={d.models.length} k="models benchmarked" cls="accent" />
      </div>
      <div className="panel">
        <h3>What this is</h3>
        <p className="cap">A reproducible research pipeline, not a price oracle.</p>
        <div className="report">
          <p>The dashboard walks the same path as the analysis: clean a decade-plus of daily data, characterise it statistically (fat tails, volatility clustering), engineer features, then pit classical machine learning against a neural network — and finally ask the only question that matters to an investor: does any of it beat buying and holding, after trading costs?</p>
        </div>
        <div className="callout" style={{marginTop:14}}>The interesting result isn't a high accuracy — it's that a careful pipeline lands at <b>~{(d.verdict.best_accuracy*100).toFixed(0)}%</b>, a neural network <b>fails to beat</b> the simple models, and most trading strategies <b>lose to costs</b>. That honesty is the contribution.</div>
      </div>
    </>
  )
}

function DataSection({ d }) {
  const src = d.meta.sources
  return (
    <>
      <div className="eyebrow">01 · The data</div>
      <h2 className="title">A continuous decade of daily Bitcoin</h2>
      <p className="lead">Two sources merged into one gap-free series: Binance for 2018 onward, a cleaned early-history feed for 2014–2017. Shown on a log axis — the only honest way to view an asset that grew ~180×.</p>
      <div className="panel">
        <h3>Close price (log scale)</h3>
        <p className="cap">{src['early-history']?.toLocaleString()} early-history days + {src.binance?.toLocaleString()} Binance days.</p>
        <div className="chart">
          <ResponsiveContainer>
            <LineChart data={d.price} margin={{left:6,right:10,top:6}}>
              <CartesianGrid stroke="#EEF0F3" vertical={false}/>
              <XAxis dataKey="date" tickFormatter={fmtYear} minTickGap={40} tick={{fontSize:11,fontFamily:'IBM Plex Mono',fill:C.soft}}/>
              <YAxis scale="log" domain={['auto','auto']} tickFormatter={v=>v>=1000?(v/1000)+'k':v} width={42} tick={{fontSize:11,fontFamily:'IBM Plex Mono',fill:C.soft}}/>
              <Tooltip content={<Tip/>}/>
              <Line dataKey="close" name="USD" stroke={C.accent} strokeWidth={1.4} dot={false}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="panel">
        <h3>Drawdown from all-time high</h3>
        <p className="cap">How far underwater the asset was at each point — the bear markets are unmistakable.</p>
        <div className="chart" style={{height:240}}>
          <ResponsiveContainer>
            <AreaChart data={d.drawdown} margin={{left:6,right:10,top:6}}>
              <CartesianGrid stroke="#EEF0F3" vertical={false}/>
              <XAxis dataKey="date" tickFormatter={fmtYear} minTickGap={40} tick={{fontSize:11,fontFamily:'IBM Plex Mono',fill:C.soft}}/>
              <YAxis width={42} tick={{fontSize:11,fontFamily:'IBM Plex Mono',fill:C.soft}} tickFormatter={v=>v+'%'}/>
              <Tooltip content={<Tip suffix="%"/>}/>
              <Area dataKey="dd" name="drawdown" stroke={C.neg} fill="#C1432E22" strokeWidth={1.2}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  )
}

function Returns({ d }) {
  const rs = d.returns_summary || {}
  return (
    <>
      <div className="eyebrow">02 · Returns & risk</div>
      <h2 className="title">Fat tails and volatility that clusters</h2>
      <p className="lead">Daily returns are nothing like a bell curve — extreme days dominate, and calm and wild periods bunch together. This is what makes volatility (not direction) the modellable part.</p>
      <div className="strip">
        <Metric v={(rs['annualised vol']*100).toFixed(0)+'%'} k="annualised volatility" cls="accent"/>
        <Metric v={rs['excess kurtosis']?.toFixed(1)} k="excess kurtosis (0 = normal)" />
        <Metric v={rs['skew']?.toFixed(2)} k="skew (crashes sharper)" cls="neg"/>
        <Metric v={(rs['min day']*100).toFixed(0)+'%'} k="worst single day" cls="neg"/>
      </div>
      <div className="grid2">
        <div className="panel">
          <h3>Distribution fit</h3>
          <p className="cap">Lower AIC = better. Fat-tailed distributions crush the Normal.</p>
          <table><thead><tr><th>Distribution</th><th>AIC</th></tr></thead><tbody>
            {(d.dist_table||[]).map((r,i)=>(<tr key={i} className={i===0?'hi':''}><td>{r.dist}{i===0?' ★':''}</td><td>{Math.round(r.AIC).toLocaleString()}</td></tr>))}
          </tbody></table>
        </div>
        <div className="panel">
          <h3>Stationarity (ADF + KPSS)</h3>
          <p className="cap">Two tests, opposite nulls — they agree.</p>
          <table><thead><tr><th>Series</th><th>ADF says</th><th>KPSS says</th></tr></thead><tbody>
            {(d.distribution_fit||[]).map((r,i)=>(<tr key={i}><td>{r.series}</td><td>{r.ADF_says}</td><td>{r.KPSS_says}</td></tr>))}
          </tbody></table>
          <div className="callout" style={{marginTop:14}}>Price is non-stationary; returns are stationary. So every model works on <b>returns</b>, never raw price.</div>
        </div>
      </div>
      {d.garch?.length>0 && (
        <div className="panel">
          <h3>GARCH volatility models</h3>
          <p className="cap">Volatility clustering justified fitting the GARCH family. Lower AIC = better fit.</p>
          <table><thead><tr><th>Model</th>{Object.keys(d.garch[0]).filter(k=>k!=='model'&&k!==Object.keys(d.garch[0])[0]).slice(0,3).map(k=>(<th key={k}>{k}</th>))}</tr></thead>
          <tbody>{d.garch.map((r,i)=>{const ks=Object.keys(r);return(<tr key={i}><td>{r[ks[0]]}</td>{ks.slice(1,4).map(k=>(<td key={k}>{typeof r[k]==='number'?r[k].toFixed(1):r[k]}</td>))}</tr>)})}</tbody></table>
        </div>
      )}
    </>
  )
}

function Models({ d }) {
  const data = d.models.map(m=>({ ...m, acc: +(m.accuracy*100).toFixed(1) }))
  const accs = data.map(m=>m.acc)
  const lo = Math.floor(Math.min(...accs, 50) - 1)   // floor below the lowest bar (and the 50% line)
  const hi = Math.ceil(Math.max(...accs, 50) + 1)
  return (
    <>
      <div className="eyebrow">03 · Models</div>
      <h2 className="title">Classical vs deep — a fair fight</h2>
      <p className="lead">Every model sees the same features and the same chronological test window. The bar to beat is the 50% coin flip. Nothing clears it by much — and the neural network, the supposed star, earns no edge over the simple models.</p>
      <div className="panel">
        <h3>Test-set directional accuracy</h3>
        <p className="cap">Reference line at 50% = a coin flip. Above it is signal; below is noise.</p>
        <div className="chart" style={{height:300}}>
          <ResponsiveContainer>
            <BarChart data={data} margin={{left:6,right:10,top:10}}>
              <CartesianGrid stroke="#EEF0F3" vertical={false}/>
              <XAxis dataKey="model" tick={{fontSize:12,fontFamily:'IBM Plex Mono',fill:C.soft}}/>
              <YAxis domain={[lo,hi]} width={40} tickFormatter={v=>v+'%'} tick={{fontSize:11,fontFamily:'IBM Plex Mono',fill:C.soft}}/>
              <Tooltip content={<Tip suffix="%"/>}/>
              <ReferenceLine y={50} stroke={C.neg} strokeDasharray="4 4" label={{value:'coin flip 50%',fontSize:11,fill:C.neg,position:'insideTopRight'}}/>
              <Bar dataKey="acc" name="accuracy" radius={[4,4,0,0]}>
                {data.map((m,i)=>(<Cell key={i} fill={m.kind==='deep'?'#6B4FB0':C.accent}/>))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="panel">
        <h3>Full comparison</h3>
        <table><thead><tr><th>Model</th><th style={{textAlign:'left'}}>Type</th><th>Accuracy</th><th>AUC</th></tr></thead><tbody>
          {d.models.map((m,i)=>(<tr key={i} className={m.model===d.verdict.best_model?'hi':''}>
            <td>{m.model}</td><td style={{textAlign:'left'}}><span className={'tag '+m.kind}>{m.kind}</span></td>
            <td>{pct(m.accuracy)}</td><td>{m.auc.toFixed(3)}</td></tr>))}
        </tbody></table>
        <div className="callout" style={{marginTop:14}}>The <b>neural network did not beat</b> the simple models. On a near-random target, a deep network has no extra structure to exploit — it just costs more compute. "Simple beats complex" is the honest finding.</div>
      </div>
    </>
  )
}

function Backtest({ d }) {
  const keys = (d.backtest_metrics||[]).map(m=>m.strategy)
  const colorFor = k => k==='Buy & Hold'?C.ink : k==='RandomForest'?C.accent : k==='XGBoost'?C.slate : '#6B4FB0'
  return (
    <>
      <div className="eyebrow">04 · Backtest</div>
      <h2 className="title">Accuracy is not profit</h2>
      <p className="lead">Turning signals into trades and charging a realistic 0.1% per trade. This is where most "predicts crypto!" projects quietly fall apart — a 51% model that trades daily bleeds out on costs.</p>
      <div className="panel">
        <h3>Equity curves on the test period</h3>
        <p className="cap">Growth of $1, after costs. Buy &amp; Hold is the line to beat.</p>
        <div className="chart">
          <ResponsiveContainer>
            <LineChart data={d.equity} margin={{left:6,right:10,top:6}}>
              <CartesianGrid stroke="#EEF0F3" vertical={false}/>
              <XAxis dataKey="date" tickFormatter={s=>s.slice(2,7)} minTickGap={50} tick={{fontSize:11,fontFamily:'IBM Plex Mono',fill:C.soft}}/>
              <YAxis width={40} tick={{fontSize:11,fontFamily:'IBM Plex Mono',fill:C.soft}}/>
              <Tooltip content={<Tip/>}/>
              {keys.map(k=>(<Line key={k} dataKey={k} stroke={colorFor(k)} strokeWidth={k==='Buy & Hold'?2:1.4} strokeDasharray={k==='Buy & Hold'?'5 4':''} dot={false}/>))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="panel">
        <h3>Strategy metrics</h3>
        <table><thead><tr><th>Strategy</th><th>Total return</th><th>Sharpe</th><th>Max DD</th><th>Trades</th></tr></thead><tbody>
          {d.backtest_metrics.map((m,i)=>(<tr key={i} className={d.beat_buyhold?.includes(m.strategy)?'hi':''}>
            <td>{m.strategy}</td><td style={{color:m.total_return<0?C.neg:C.pos}}>{(m.total_return*100).toFixed(1)}%</td>
            <td>{m.sharpe}</td><td style={{color:C.neg}}>{(m.max_drawdown*100).toFixed(0)}%</td><td>{m.trades}</td></tr>))}
        </tbody></table>
        <div className="callout" style={{marginTop:14}}>
          {d.beat_buyhold?.length
            ? <>Only <b>{d.beat_buyhold.join(', ')}</b> beat buy-and-hold on this window — but with one test period and a sub-50% win rate, that's <b>suggestive, not proven</b>. It needs multi-window walk-forward validation before anyone should believe it.</>
            : <>No strategy beat buy-and-hold after costs — the honest, common outcome.</>}
        </div>
      </div>
    </>
  )
}

function Method({ d }) {
  return (
    <>
      <div className="eyebrow">05 · Method & honesty</div>
      <h2 className="title">How it was built — and its limits</h2>
      <p className="lead">The auto-generated verdict from the final notebook, plus the principles that keep the whole thing honest.</p>
      <div className="panel report"><Markdown text={d.report} /></div>
      <div className="grid2">
        <div className="panel"><h3>Reproducible</h3><p className="cap" style={{marginBottom:0}}>One command — <code style={{fontFamily:'IBM Plex Mono'}}>python run_all.py</code> — executes all nine notebooks in order and regenerates every figure, table, and this dashboard's data.</p></div>
        <div className="panel"><h3>Leakage-aware</h3><p className="cap" style={{marginBottom:0}}>All splits are chronological. Scalers fit on train only. Targets are strictly next-day. No shuffling of time-series data — the bug that fakes 99% accuracy.</p></div>
      </div>
    </>
  )
}

function Metric({ v, k, cls='' }) {
  return <div className={'metric '+cls}><div className="v">{v}</div><div className="k">{k}</div></div>
}

function Markdown({ text }) {
  const lines = (text||'').split('\n')
  const out = []
  lines.forEach((ln, i) => {
    if (ln.startsWith('## ')) out.push(<h4 key={i}>{ln.slice(3)}</h4>)
    else if (ln.startsWith('# ')) out.push(<h4 key={i} style={{fontSize:18}}>{ln.slice(2)}</h4>)
    else if (ln.startsWith('- ')) out.push(<li key={i}>{ln.slice(2)}</li>)
    else if (ln.trim()) out.push(<p key={i}>{ln}</p>)
  })
  return <>{out}</>
}