<script>
  // The internal logic of this component is too complicated and subtle
  // Do NOT try to update any logic before consulting
  import { untrack } from 'svelte'
  import srpc from '$lib/utilities/srpc.js'
  import error from '$lib/utilities/error.js'
  import { token } from '$lib/S.svelte'
  import swal from 'sweetalert2'
  import { AIcon, ASwitch, ACheckbox } from 'ace.svelte'
  import { mdiAlphaXBox, mdiAlphaYBox, mdiCheckboxBlankOutline, mdiCheckboxMarked, mdiOpenInNew } from '@mdi/js'
  import { parse } from 'ini'
  import YAML from 'yaml'
  import moment from 'moment'
  import Plotly from 'plotly.js-dist-min'
  import { debounce } from '$lib/utilities/utils.js'

  let { path, ...props } = $props()
  let meta = $state({}), metaKey = $state(0)
  let nop = $state(0) // number of rows
  let csv = [], hasData = $state(false), hasPlot = false, lastSize = 0
  let indep = $state([]), dep = $state([]), logx = $state(false), logy = $state(false), zaxis = $state({})
  let refresh = $state(false), loading = false
  let plotHeight = 0, plotWidth = 0, plotContainer = $state(null)

  const colors = ['#1f77b4', '#ff7f0e', '#d62728', '#2ca02c', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf']
  const getLabel = v => `${v.label}${v.category ? ` [${v.category}]` : ''} (${v.units})`

  async function init () {
    Plotly.newPlot('plot')
    hasPlot = true
    meta = {}
    csv = []
    hasData = false
    lastSize = 0
    nop = 0
    indep = []
    dep = []
    logx = false
    logy = false
    zaxis = { decimal: 0 }
    const res = await srpc.grapher.get(token(), path, true, -1)
    if (await error(res)) return
    meta.independent = []
    meta.dependent = []
    if (res.res.yml) {
      const obj = YAML.parse(res.res.yml)
      meta.general = {
        created: obj.created,
        completed: obj.completed,
        title: obj.title,
        type: 'yml'
      }
      meta.independent = obj.independent.map((x, i) => ({ label: x[0], units: x[1], index: i }))
      meta.dependent = obj.dependent.map((x, i) => ({ label: x[0], units: x[1], index: i }))
      meta.paramStr = YAML.stringify(obj.parameters)
    } else { // ini
      const obj = parse(res.res.ini)
      const params = {}
      meta.general = obj.General
      let iI = 0, iD = 0, iP = 0
      for (const k in obj) {
        if (k.indexOf('Independent') === 0) {
          obj[k].index = iI++
          meta.independent.push(obj[k])
        }
        if (k.indexOf('Dependent') === 0) {
          obj[k].index = iD++
          meta.dependent.push(obj[k])
        }
        if (k.indexOf('Parameter') === 0) {
          obj[k].index = iP++
          params[obj[k].label] = obj[k].data
        }
      }
      meta.paramStr = YAML.stringify(new Proxy(params, { get: (t, k) => isNaN(+t[k]) ? t[k] : +t[k] }))
    }
    if (meta.independent[0]) indep.push(meta.independent[0])
    if (meta.independent[1]) indep.push(meta.independent[1])
    if (meta.dependent[0]) dep.push(meta.dependent[0])
    refresh = meta.general.completed === 'N/A' || (moment() - moment(meta.general.created.replace(',', ''))) < 300e3
    getData()
  }

  async function getData () {
    if (!meta.general || loading) return
    let p = path
    loading = true
    const res = await srpc.grapher.get(token(), path, false, lastSize)
    loading = false
    if (p !== path || !res.res.csv) return
    if (await error(res)) return
    lastSize = res.res.size
    const newRows = res.res.csv.replaceAll('\u0000', '').replaceAll('\r', '').split('\n').filter(x => x.match(/\S/)).map(x => x.split(',').map(y => Number(y)))
    csv = csv.concat(newRows) // efficient
    if (csv.length) hasData = true
    computeIndepValues()
    setTimeout(plot)
  }
  setInterval(() => {
    if (refresh) getData()
  }, 1e3)

  function computeIndepValues () {
    for (const v of meta.independent) v.values = new Set()
    for (const r of csv) {
      for (let i = 0; i < meta.independent.length; i++) {
        meta.independent[i].values.add(r[i])
      }
    }
    for (const v of meta.independent) {
      v.values = [...v.values].sort((a, b) => a - b)
      if (!v.values.includes(v.value)) v.value = v.values[0]
    }
    metaKey++
  }

  function plot () {
    if (!hasData || !dep.length) return
    const traces = []
    let xlabel = '', ylabel = '', zlabel = ''
    const L = meta.independent.length
    const filterCSV = csv.filter(r => {
      for (const v of meta.independent) {
        if (indep.includes(v) || v.value === '') continue
        if (Math.abs(v.value - r[v.index]) > 1e-7) return false
      }
      return true
    })
    nop = filterCSV.length
    if (indep.length === 0 && dep.length <= 1) return
    if (indep.length === 0) {
      for (let i = 0; i + 1 < dep.length; i += 2) traces.push({
        x: filterCSV.map(r => r[dep[i].index + L]),
        y: filterCSV.map(r => r[dep[i + 1].index + L]),
        mode: 'markers',
        type: 'scattergl',
        name: getLabel(dep[i]) + ' vs ' + getLabel(dep[i + 1]),
        marker: { color: colors[dep[i].index] }
      })
      xlabel = getLabel(dep[0])
      ylabel = getLabel(dep[1])
    } else if (indep.length <= 1) { // 1D
      for (const v of dep) traces.push({
        x: filterCSV.map(r => r[indep[0].index]),
        y: filterCSV.map(r => r[v.index + L]),
        mode: 'lines+markers',
        type: 'scattergl',
        name: getLabel(v),
        marker: { color: colors[v.index] },
        line: { width: 1, color: colors[v.index] }
      })
      xlabel = getLabel(indep[0])
      ylabel = getLabel(dep[0])
    } else { // 2D
      traces[0] = {
        type: 'heatmap',
        coloraxis: 'coloraxis',
        x: filterCSV.map(r => r[indep[0].index]),
        y: filterCSV.map(r => r[indep[1].index]),
        z: filterCSV.map(r => r[dep[0].index + L])
      }
      xlabel = getLabel(indep[0])
      ylabel = getLabel(indep[1])
      zlabel = getLabel(dep[0])
    }
    const Plot = hasPlot ? Plotly.react : Plotly.newPlot
    Plot('plot', traces, {
      title: { text: meta.general.title },
      margin: { t: 60 },
      xaxis: { title: { text: xlabel }, linecolor: 'black', linewidth: 2, mirror: true, type: logx ? 'log' : 'linear' },
      yaxis: { title: { text: ylabel }, linecolor: 'black', linewidth: 2, mirror: true, type: logy ? 'log' : 'linear' },
      coloraxis: { colorscale: 'Portland', colorbar: { title: { text: zlabel, side: 'right' } }, cauto: (typeof zaxis.cmin != 'number') && (typeof zaxis.cmax != 'number'), cmin: zaxis.cmin, cmax: zaxis.cmax }
    }, { displaylogo: false, showTips: false, toImageButtonOptions: { format: 'png', filename: meta.general.title, scale: 3 } })
    setTimeout(() => {
      hasPlot = true
      plotHeight = plotContainer.offsetHeight
      plotWidth = plotContainer.offsetWidth
    })
  }

  function toggleIndep (v) {
    if (indep.includes(v)) {
      indep = indep.filter(x => x !== v)
      metaKey++
      return plot()
    }
    if (indep.length >= 2) indep.shift()
    if (indep.length) dep = dep[0] ? [dep[0]] : []
    indep.push(v)
    metaKey++
    return plot()
  }

  function toggleDep (v) {
    if (dep.includes(v)) {
      dep = dep.filter(x => x !== v)
      metaKey++
      return plot()
    }
    if (indep.length >= 2 || v.units !== dep[0]?.units) dep = []
    dep.push(v)
    metaKey++
    return plot()
  }

  const debouncedPlot = debounce(plot, 100)

  function sliceKeydown (v, e) {
    const newValue = e.srcElement.value
    function findNearest () {
      let vv = v.values[0]
      for (const va of v.values) {
        if (Math.abs(newValue - va) < Math.abs(newValue - vv)) vv = va
      }
      return vv
    }
    if (e.key === 'Backspace' && newValue === '') {
      v.value = ''
      debouncedPlot()
    }
    if (e.key === 'Enter') {
      v.value = findNearest()
      metaKey++
      debouncedPlot()
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const i = v.values.indexOf(findNearest())
      if (i < v.values.length - 1) v.value = v.values[i + 1]
      else v.value = v.values[i]
      e.srcElement.value = v.value // manually update
      debouncedPlot()
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const i = v.values.indexOf(findNearest())
      if (i > 0) v.value = v.values[i - 1]
      else v.value = v.values[i]
      e.srcElement.value = v.value // manually update
      debouncedPlot()
    }
  }

  $effect(() => {
    if (path) untrack(init)
  })

  $effect(() => {
    logx; logy; zaxis.cmin; zaxis.cmax; untrack(debouncedPlot)
  })

  function open () {
    window.open('../graph/?path=' + encodeURIComponent(path), path, 'popup,width=600,height=500,left=10,top=10')
  }

  window.onresize = () => {
    hasPlot = false
    debouncedPlot()
  }
  window.onmouseup = e => setTimeout(() => {
    if (!hasData || !hasPlot || (plotContainer.offsetHeight === plotHeight && plotContainer.offsetWidth === plotWidth)) return
    hasPlot = false
    debouncedPlot()
    plotWidth = plotContainer.offsetWidth
    plotHeight = plotContainer.offsetHeight
  })
</script>

<div class="flex flex-col w-full bg-gray-100" style="min-width: 400px;">
  <div bind:this={plotContainer} style="width: calc(100% - 0.5rem);" class={'transition resize border rounded overflow-hidden ' + (hasData ? 'opacity-100' : 'opacity-0')}>
    <div id="plot" class="h-full"></div>
  </div>
  {#if meta.general}
    <p class="left-0 top-0 text-xs select-all px-2">{path}.csv</p>
    <div class="flex flex-col px-2">
      <div class="flex transition-all">
        {#key metaKey}
          <div class="py-1 px-2 w-1/2 flex flex-col">
            <h3 class="font-bold my-2">Independent:</h3>
            {#each meta.independent as v}
              <button class={'flex items-center m-1 ' + (indep.includes(v) ? 'text-blue-700' : 'text-gray-700')} onclick={() => toggleIndep(v)}>
                <AIcon class="mr-2" path={indep[0] === v ? mdiAlphaXBox : (indep[1] === v ? mdiAlphaYBox : mdiCheckboxBlankOutline)} size="1.5rem" style="min-width: 1.5rem;"></AIcon>
                <b class="break-word text-left">{getLabel(v)}</b>
              </button>
              {#if !indep.includes(v)}
                <div class="flex items-center mx-1 ml-6 text-sm">
                  <span>Slice:</span>
                  <input class="bg-white mx-2 rounded px-1 font-mono" style="width: 5rem;" value={v.value} onkeydown={e => sliceKeydown(v, e)}>
                  <span>({v.units})</span>
                </div>
              {/if}
            {/each}
            <code class="block mx-2 my-1 text-gray-500 text-sm"># of points: {nop}</code>
          </div>
          <div class="py-1 px-2 w-1/2 overflow-x-hidden">
            <h3 class="font-bold my-2">Dependent:</h3>
            {#each meta.dependent as v}
              <button class="flex items-center m-1 text-gray-700" style:color={dep.includes(v) ? colors[v.index] : ''} onclick={() => toggleDep(v)}>
                <AIcon class="mr-2" path={dep.includes(v) ? mdiCheckboxMarked : mdiCheckboxBlankOutline} size="1.5rem" style="min-width: 1.5rem;"></AIcon>
                <b class="break-word text-left">{getLabel(v)}</b>
              </button>
            {/each}
          </div>
        {/key}
      </div>
      <div class="flex flex-wrap transition-all">
        <b class="p-2 flex items-center mx-2">logX<ACheckbox bind:value={logx} size="1.25rem"></ACheckbox></b>
        <b class="p-2 flex items-center mx-2">logY<ACheckbox bind:value={logy} size="1.25rem"></ACheckbox></b>
        {#if indep.length == 2}
          <div class="mx-2 p-2 flex items-center">
            <b>Z lim:</b>
            <input class="bg-white mx-2 rounded pl-1 font-mono" style="width: 5rem;" bind:value={zaxis.cmin} step={10 ** zaxis.decimal} type="number" placeholder="min">
            <span>-</span>
            <input class="bg-white mx-2 rounded pl-1 font-mono" style="width: 5rem;" bind:value={zaxis.cmax} step={10 ** zaxis.decimal} type="number" placeholder="max">
            <span>(logΔ: </span>
            <input class="bg-white mx-1 rounded pl-1 font-mono" style="width: 2.5rem;" bind:value={zaxis.decimal} type="number" placeholder="decimal">
            <span>)</span>
          </div>
        {/if}
      </div>
      <div class="flex items-center p-2 wrap whitespace-nowrap">
        <ASwitch bind:value={refresh} size="1.25rem"></ASwitch>
        <button onclick={() => { refresh = !refresh }} class="ml-1 mr-4 font-bold cursor-pointer">Auto Refresh</button>
        <button class="flex items-center mx-2 rounded bg-white text-sm px-2 py-1 transition-all shadow hover:shadow-md" onclick={open}>
          <AIcon path={mdiOpenInNew} size="1rem" class="mr-1"></AIcon>
          <b>Open in New</b>
        </button>
      </div>
      <div class="w-full p-2 font-mono text-sm grid grid-flow-col grid-rows-4">
        {#each Object.keys(meta.general) as k}
          <div class="my-0.5">
            <div class="px-1 w-min rounded bg-gray-700 text-white whitespace-nowrap inline">{k}</div>
            <div class="inline">{meta.general[k]}</div>
          </div>
        {/each}
      </div>
      <pre class="p-2 w-full font-mono text-sm break-all whitespace-pre-wrap">{meta.paramStr}</pre>
    </div>
  {/if}
</div>
