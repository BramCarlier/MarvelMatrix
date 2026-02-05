<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { ITEMS } from './data/mcu'

type Kind = typeof ITEMS[number]['kind']

const theme = ref<'dark'|'light'>('dark')
const view = ref<'cards'|'timeline'|'release'>('timeline')
const showFilters = ref(false)
const expandedChars = ref(new Set<string>())

function isExpanded(id:string){ return expandedChars.value.has(id) }
function toggleExpanded(id:string){
  if(expandedChars.value.has(id)) expandedChars.value.delete(id)
  else expandedChars.value.add(id)
}

const state = reactive({
  q: '',
  kinds: new Set<Kind>(['Film','Series','Special','One-Shot']),
  phases: new Set<string>(),
  stories: new Set<string>(),
  chars: new Set<string>(),
  onlyInfinityStones: false,
})

const allPhases = computed(() => Array.from(new Set(ITEMS.map(i => i.phase))).sort())
const allStories = computed(() => Array.from(new Set(ITEMS.flatMap(i => i.stories))).sort())
const allChars = computed(() => Array.from(new Set(ITEMS.flatMap(i => i.characters))).sort())

function toggleSet<T>(set: Set<T>, v: T){
  if(set.has(v)) set.delete(v); else set.add(v)
}

function norm(s:string){ return s.trim().toLowerCase() }

const filtered = computed(() => {
  const q = norm(state.q)
  return ITEMS.filter(it => {
    if(!state.kinds.has(it.kind as any)) return false
    if(state.phases.size && !state.phases.has(it.phase)) return false
    if(state.stories.size){
      for(const s of state.stories){
        if(!it.stories.includes(s)) return false
      }
    }
    if(state.onlyInfinityStones && it.infinityStones.length===0) return false
    if(state.chars.size){
      for(const c of state.chars){
        if(!it.characters.includes(c)) return false
      }
    }
    if(q){
      const hay = [
        it.title, it.kind, it.phase, it.timeline, it.releaseYear, it.synopsis,
        it.stories.join(' '),
        it.characters.join(' ')
      ].join(' ').toLowerCase()
      if(!hay.includes(q)) return false
    }
    return true
  })
})

const sorted = computed(() => {
  const arr = filtered.value.slice()
  if(view.value === 'release') arr.sort((a,b) => (a.releaseYear - b.releaseYear) || (a.title.localeCompare(b.title)))
  else arr.sort((a,b) => (a.timelineOrder - b.timelineOrder) || (a.timelineYear - b.timelineYear) || (a.releaseYear - b.releaseYear) || (a.title.localeCompare(b.title))))
  return arr
})

function chipToggleCharacter(c:string){
  toggleSet(state.chars, c)
}

function resetAll(){
  state.q = ''
  state.kinds = new Set<Kind>(['Film','Series','Special','One-Shot'])
  state.phases.clear()
  state.stories.clear()
  state.chars.clear()
  state.onlyInfinityStones = false
}

function setTheme(t:'dark'|'light'){ theme.value = t }


const timelineWrap = ref<HTMLElement|null>(null)
const timelineNodes = ref<{id:string, y:number}[]>([])
let ro: ResizeObserver | null = null

function computeTimelineNodes(){
  const wrap = timelineWrap.value
  if(!wrap) return
  const rows = Array.from(wrap.querySelectorAll<HTMLElement>('.tItem'))
  const nodes = rows.map(r => {
    const id = r.getAttribute('data-id') || ''
    const line = r.querySelector<HTMLElement>('.tLine')
    const node = r.querySelector<HTMLElement>('.tNode')
    if(!line || !node) return {id, y: r.offsetTop + 20}
    // y relative to wrap
    const y = r.offsetTop + (node.offsetTop + node.offsetHeight/2)
    return {id, y}
  }).filter(n => n.id)
  timelineNodes.value = nodes
}

watch([view, () => sorted.value.length], async () => {
  // next tick-ish
  setTimeout(() => {
    computeTimelineNodes()
  }, 0)
})
onMounted(() => {
  ro = new ResizeObserver(() => computeTimelineNodes())
  if(timelineWrap.value) ro.observe(timelineWrap.value)

  document.documentElement.dataset.theme = theme.value
  // Start typing anywhere focuses search (accessibility: ignore when typing in inputs)
  window.addEventListener('keydown', (e) => {
    const el = document.activeElement as HTMLElement | null
    const typingInField = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || (el as any).isContentEditable)
    if(typingInField) return
    if(e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey){
      const input = document.getElementById('searchInput') as HTMLInputElement | null
      input?.focus()
    }
    if(e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey){
      e.preventDefault()
      const input = document.getElementById('searchInput') as HTMLInputElement | null
      input?.focus()
    }
  }, { passive: false })
})

onUnmounted(() => { if(ro && timelineWrap.value) ro.unobserve(timelineWrap.value) })

watch(theme, (t) => {
  document.documentElement.dataset.theme = t
})
</script>

<template>
  <div class="container">
    <div class="header">
      <div>
        <h1 class="title">MCU Recap &amp; Timeline</h1>
        <div class="small">Films + Disney+ series + specials (plus optional One-Shots &amp; Defenders saga).</div>
      </div>

      <div class="toolbar">
        <select class="select" v-model="theme" aria-label="Theme">
          <option value="dark">Dark</option>
          <option value="light">Light</option>
        </select>

        <select class="select" v-model="view" aria-label="View">
          <option value="timeline">Timeline (story order)</option>
          <option value="release">Release (by year)</option>
          <option value="cards">Cards</option>
        </select>

        <button class="btn" @click="showFilters = true">Filters</button>
      </div>
    </div>

    <div class="search" role="search">
      <strong style="opacity:.85">Search</strong>
      <input id="searchInput" v-model="state.q" placeholder='Try: "Loki", "Wakanda", "Infinity Stones"...' />
      <span class="pill" title="Press / to focus search">/</span>
    </div>

    <div class="pills" v-if="state.phases.size || state.stories.size || state.chars.size || state.onlyInfinityStones">
      <span class="pill" v-if="state.onlyInfinityStones"><strong>Filter</strong> Infinity Stones only</span>
      <span class="pill" v-for="p in Array.from(state.phases)" :key="'p'+p"><strong>Phase</strong> {{ p }}</span>
      <span class="pill" v-for="s in Array.from(state.stories)" :key="'s'+s"><strong>Story</strong> {{ s }}</span>
      <span class="pill" v-for="c in Array.from(state.chars)" :key="'c'+c"><strong>Character</strong> {{ c }}</span>
      <button class="btn" @click="resetAll">Clear</button>
    </div>

    <div class="small" style="margin:6px 2px 12px">
      {{ sorted.length }} item(s) shown • {{ ITEMS.length }} total in dataset
    </div>

    <div v-if="view === 'timeline'" class="timelineList" ref="timelineWrap">
  <svg class="branchSvg" :style="{height: (timelineWrap?.scrollHeight||0) + 'px'}" aria-hidden="true">
    <defs>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2.2" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <linearGradient id="flow" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="rgba(255,255,255,0.15)"/>
        <stop offset="50%" stop-color="rgba(255,255,255,0.95)"/>
        <stop offset="100%" stop-color="rgba(255,255,255,0.15)"/>
      </linearGradient>
    </defs>
    <path class="branchPath" :d="`M 50 0 C 54 120, 46 240, 50 360 S 54 720, 50 ${timelineWrap?.scrollHeight||0}`" />
    <path class="branchFlow" :d="`M 50 0 C 54 120, 46 240, 50 360 S 54 720, 50 ${timelineWrap?.scrollHeight||0}`" />
    <circle v-for="n in timelineNodes" :key="n.id" class="branchNode" :cx="50" :cy="n.y" r="6" />
  </svg>
      <div class="tItem" v-for="it in sorted" :key="it.id" :data-id="it.id">
        <div class="tDate">
          <div>{{ it.timelineYear }}</div>
          <small>{{ it.kind }}</small>
        </div>

        <div class="tLine" aria-hidden="true">
          <div class="tRail" style="opacity:0"></div>
          <div class="tNode"></div>
        </div>

        <div class="card">
          <div class="cardHeader">
            <h3>{{ it.title }}</h3>
            <div class="yearBadge"> {{ it.releaseYear }} </div>
          </div>

          <div class="meta">
            <span class="tag kind">{{ it.kind.toUpperCase() }}</span>
            <span class="tag phase">{{ it.phase }}</span>
            <span class="tag story" v-for="s in it.stories.slice(0,4)" :key="it.id+s">{{ s }}</span>
          </div>

          <div class="syn">{{ it.synopsis }}</div>

          <div class="stones" v-if="it.infinityStones.length">
            <span class="stoneLabel">Stones:</span>
            <span v-for="st in it.infinityStones" :key="it.id+st" class="stoneDot" :title="st"
              :style="{
                background: st==='Space' ? '#2b7cff'
                  : st==='Mind' ? '#ffcf3a'
                  : st==='Reality' ? '#f0131e'
                  : st==='Power' ? '#7a3cff'
                  : st==='Time' ? '#11b870'
                  : '#ff7a1a'
              }"></span>
          </div>

          <div class="characters">
            <span v-for="c in isExpanded(it.id) ? it.characters : it.characters.slice(0,18)" :key="it.id+c"
              class="chip" :class="{active: state.chars.has(c)}"
              @click="chipToggleCharacter(c)" role="button" tabindex="0">
              {{ c }}
            </span>
            <span v-if="<span v-if="it.characters.length > 18" class="small" style="cursor:pointer" @click="toggleExpanded(it.id)">{{ isExpanded(it.id) ? 'Show less' : '+ ' + (it.characters.length - 18) + ' more' }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="view === 'release'" class="grid">
      <div class="card" v-for="it in sorted" :key="it.id">
        <div class="cardHeader">
          <h3>{{ it.title }}</h3>
          <div class="yearBadge">{{ it.releaseYear }}</div>
        </div>
        <div class="meta">
          <span class="tag kind">{{ it.kind.toUpperCase() }}</span>
          <span class="tag phase">{{ it.phase }}</span>
          <span class="tag">{{ it.releaseDate || '—' }}</span>
        </div>
        <div class="syn">{{ it.synopsis }}</div>
        <div class="characters">
          <span v-for="c in isExpanded(it.id) ? it.characters : it.characters.slice(0,16)" :key="it.id+c" class="chip" :class="{active: state.chars.has(c)}"
            @click="chipToggleCharacter(c)">{{ c }}</span>
          <span v-if="it.characters.length > 16" class="small">{{ isExpanded(it.id) ? 'Show less' : '+ ' + (it.characters.length - 16) + ' more' }}</span>
        </div>
      </div>
    </div>

    <div v-else class="grid">
      <div class="card" v-for="it in sorted" :key="it.id">
        <div class="cardHeader">
          <h3>{{ it.title }}</h3>
          <div class="yearBadge">{{ it.releaseYear }}</div>
        </div>
        <div class="meta">
          <span class="tag kind">{{ it.kind.toUpperCase() }}</span>
          <span class="tag phase">{{ it.phase }}</span>
          <span class="tag">{{ it.timeline }}</span>
        </div>
        <div class="syn">{{ it.synopsis }}</div>
        <div class="characters">
          <span v-for="c in isExpanded(it.id) ? it.characters : it.characters.slice(0,16)" :key="it.id+c" class="chip" :class="{active: state.chars.has(c)}"
            @click="chipToggleCharacter(c)">{{ c }}</span>
          <span v-if="it.characters.length > 16" class="small">{{ isExpanded(it.id) ? 'Show less' : '+ ' + (it.characters.length - 16) + ' more' }}</span>
        </div>
      </div>
    </div>

    <teleport to="body">
      <div v-if="showFilters" class="backdrop" @click.self="showFilters=false" role="dialog" aria-modal="true">
        <div class="panel">
          <div class="row" style="justify-content:space-between;align-items:center">
            <h4 style="margin:0">Filters</h4>
            <button class="btn" @click="showFilters=false">Close</button>
          </div>

          <hr />

          <div>
            <div class="small" style="margin-bottom:8px">Type</div>
            <div class="row">
              <label class="pill" v-for="k in ['Film','Series','Special','One-Shot']" :key="k">
                <input type="checkbox" :checked="state.kinds.has(k as any)" @change="toggleSet(state.kinds, k as any)" />
                {{ k }}
              </label>
            </div>
          </div>

          <hr />

          <div>
            <div class="small" style="margin-bottom:8px">Phase</div>
            <div class="row">
              <button class="pill" v-for="p in allPhases" :key="p" @click="toggleSet(state.phases, p)"
                :style="{outline: state.phases.has(p) ? '2px solid rgba(240,19,30,.35)' : 'none'}">
                {{ p }}
              </button>
            </div>
          </div>

          <hr />

          <div>
            <div class="row" style="justify-content:space-between;align-items:center">
              <div class="small">Storylines (AND filter)</div>
              <label class="pill">
                <input type="checkbox" v-model="state.onlyInfinityStones" />
                Infinity Stones only
              </label>
            </div>
            <div class="row" style="margin-top:8px">
              <button class="pill" v-for="s in allStories" :key="s" @click="toggleSet(state.stories, s)"
                :style="{outline: state.stories.has(s) ? '2px solid rgba(43,124,255,.35)' : 'none'}">
                {{ s }}
              </button>
            </div>
          </div>

          <hr />

          <div>
            <div class="small" style="margin-bottom:8px">Characters (AND filter)</div>
            <input class="search" style="width:100%" v-model="state.q" placeholder="Search title, story, characters… (same as main search)" />
            <div class="row" style="margin-top:10px">
              <button class="pill" v-for="c in allChars.slice(0,80)" :key="c" @click="toggleSet(state.chars, c)"
                :style="{outline: state.chars.has(c) ? '2px solid rgba(240,19,30,.35)' : 'none'}">
                {{ c }}
              </button>
            </div>
            <div class="small" style="margin-top:10px">Tip: tap character chips on cards to add/remove them instantly.</div>
          </div>

          <hr />
          <div class="row">
            <button class="btn" @click="resetAll">Reset all</button>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>
