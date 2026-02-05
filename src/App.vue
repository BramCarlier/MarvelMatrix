<template>
  <div class="container">
    <div class="header">
      <div>
        <h1 class="title">MCU Recap &amp; Timeline</h1>
        <div class="small">Films + Disney+ series + specials (plus optional One-Shots &amp; Defenders saga).</div>
      </div>

      <div class="toolbar">
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
      <input
        id="searchInput"
        v-model="state.q"
        placeholder='Try: "Loki", "Wakanda", "Infinity Stones"...'
      />
      <span class="pill" title="Press / to focus search">/</span>
    </div>

    <div class="pills" v-if="state.phases.size || state.stories.size || state.chars.size">
      <span class="pill" v-for="p in Array.from(state.phases)" :key="'p'+p"><strong>Phase</strong> {{ p }}</span>
      <span class="pill" v-for="s in Array.from(state.stories)" :key="'s'+s"><strong>Story</strong> {{ s }}</span>
      <span class="pill" v-for="c in Array.from(state.chars)" :key="'c'+c"><strong>Character</strong> {{ c }}</span>
      <button class="btn" @click="resetAll">Clear</button>
    </div>

    <div class="small" style="margin:6px 2px 12px">
      {{ sorted.length }} item(s) shown • {{ ITEMS.length }} total in dataset
    </div>

    <!-- TIMELINE VIEW -->
    <div v-if="view === 'timeline'" class="timelineList" ref="timelineWrap">
      <svg
        class="branchSvg"
        :width="timelineSvgWidth"
        :height="timelineSvgHeight"
        aria-hidden="true"
      >
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <linearGradient id="flow" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="rgba(255,255,255,0.12)" />
            <stop offset="50%" stop-color="rgba(255,255,255,0.98)" />
            <stop offset="100%" stop-color="rgba(255,255,255,0.12)" />
          </linearGradient>
        </defs>

        <!-- main spine path -->
        <path class="branchPath" :d="branchPathD" />
        <!-- animated flow overlay -->
        <path class="branchFlow" :d="branchPathD" />

        <!-- nodes -->
        <circle
          v-for="n in timelineNodes"
          :key="n.id"
          class="branchNode"
          :cx="branchX"
          :cy="n.y"
          r="7"
        />
      </svg>

      <div class="tItem" v-for="it in sorted" :key="it.id" :data-id="it.id">
        <div class="tDate">
          <div>{{ formatTimelineYear(it.timelineYear) }}</div>
          <small>{{ it.kind }}</small>
        </div>

        <!-- keep this column for spacing but hide node/rail to avoid double dots -->
        <div class="tLine" aria-hidden="true">
          <div class="tRail" style="opacity:0"></div>
          <div class="tNode" style="opacity:0"></div>
        </div>

        <div class="card">
          <div class="cardHeader">
            <h3>{{ it.title }}</h3>
            <!-- timeline view: DO NOT show release year badge -->
          </div>

          <div class="meta">
            <span class="tag kind">{{ it.kind.toUpperCase() }}</span>
            <span class="tag phase">{{ it.phase }}</span>
            <span class="tag story" v-for="s in it.stories.slice(0,4)" :key="it.id+s">{{ s }}</span>
          </div>

          <div class="syn">{{ it.synopsis }}</div>

          <div class="stones" v-if="it.infinityStones && it.infinityStones.length">
            <span class="stoneLabel">Stones:</span>
            <span
              v-for="st in it.infinityStones"
              :key="it.id+st"
              class="stoneDot"
              :title="st"
              :style="{ background: stoneColor(st) }"
            />
          </div>

          <div class="characters">
            <span
              v-for="c in (isExpanded(it.id) ? it.characters : it.characters.slice(0,18))"
              :key="it.id+c"
              class="chip"
              :class="{ active: state.chars.has(c) }"
              @click="chipToggleCharacter(c)"
              role="button"
              tabindex="0"
            >
              {{ c }}
            </span>

            <span
              v-if="it.characters && it.characters.length > 18"
              class="small"
              style="cursor:pointer"
              @click="toggleExpanded(it.id)"
            >
              {{ isExpanded(it.id) ? 'Show less' : '+ ' + (it.characters.length - 18) + ' more' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- RELEASE VIEW -->
    <div v-else-if="view === 'release'" class="grid">
      <div class="card" v-for="it in sorted" :key="it.id">
        <div class="cardHeader">
          <h3>{{ it.title }}</h3>
          <div class="yearBadge">{{ it.releaseYear }}</div>
        </div>

        <div class="meta">
          <span class="tag kind">{{ it.kind.toUpperCase() }}</span>
          <span class="tag phase">{{ it.phase }}</span>
          <!-- release view: do NOT show timeline year -->
          <span class="tag">{{ it.releaseDate || '—' }}</span>
        </div>

        <div class="syn">{{ it.synopsis }}</div>

        <div class="stones" v-if="it.infinityStones && it.infinityStones.length">
          <span class="stoneLabel">Stones:</span>
          <span
            v-for="st in it.infinityStones"
            :key="it.id+st"
            class="stoneDot"
            :title="st"
            :style="{ background: stoneColor(st) }"
          />
        </div>

        <div class="characters">
          <span
            v-for="c in (isExpanded(it.id) ? it.characters : it.characters.slice(0,16))"
            :key="it.id+c"
            class="chip"
            :class="{ active: state.chars.has(c) }"
            @click="chipToggleCharacter(c)"
          >
            {{ c }}
          </span>

          <span
            v-if="it.characters && it.characters.length > 16"
            class="small"
            style="cursor:pointer"
            @click="toggleExpanded(it.id)"
          >
            {{ isExpanded(it.id) ? 'Show less' : '+ ' + (it.characters.length - 16) + ' more' }}
          </span>
        </div>
      </div>
    </div>

    <!-- CARDS VIEW -->
    <div v-else class="grid">
      <div class="card" v-for="it in sorted" :key="it.id">
        <div class="cardHeader">
          <h3>{{ it.title }}</h3>
          <div class="yearBadge">{{ it.releaseYear }}</div>
        </div>

        <div class="meta">
          <span class="tag kind">{{ it.kind.toUpperCase() }}</span>
          <span class="tag phase">{{ it.phase }}</span>
          <!-- cards view can show timeline string if you want -->
          <span class="tag">{{ it.timeline }}</span>
        </div>

        <div class="syn">{{ it.synopsis }}</div>

        <div class="stones" v-if="it.infinityStones && it.infinityStones.length">
          <span class="stoneLabel">Stones:</span>
          <span
            v-for="st in it.infinityStones"
            :key="it.id+st"
            class="stoneDot"
            :title="st"
            :style="{ background: stoneColor(st) }"
          />
        </div>

        <div class="characters">
          <span
            v-for="c in (isExpanded(it.id) ? it.characters : it.characters.slice(0,16))"
            :key="it.id+c"
            class="chip"
            :class="{ active: state.chars.has(c) }"
            @click="chipToggleCharacter(c)"
          >
            {{ c }}
          </span>

          <span
            v-if="it.characters && it.characters.length > 16"
            class="small"
            style="cursor:pointer"
            @click="toggleExpanded(it.id)"
          >
            {{ isExpanded(it.id) ? 'Show less' : '+ ' + (it.characters.length - 16) + ' more' }}
          </span>
        </div>
      </div>
    </div>

    <!-- FILTERS MODAL -->
    <teleport to="body">
      <div
        v-if="showFilters"
        class="backdrop"
        @click.self="showFilters=false"
        role="dialog"
        aria-modal="true"
      >
        <div class="panel">
          <div class="row" style="justify-content:space-between;align-items:center">
            <h4 style="margin:0">Filters</h4>
            <button class="btn" @click="showFilters=false">Close</button>
          </div>

          <hr />

          <div>
            <div class="small" style="margin-bottom:8px">Type</div>
            <div class="row">
              <label class="pill" v-for="k in kindOptions" :key="k">
                <input type="checkbox" :checked="state.kinds.has(k)" @change="toggleSet(state.kinds, k)" />
                {{ k }}
              </label>
            </div>
          </div>

          <hr />

          <div>
            <div class="small" style="margin-bottom:8px">Phase</div>
            <div class="row">
              <button
                class="pill"
                v-for="p in allPhases"
                :key="p"
                @click="toggleSet(state.phases, p)"
                :style="{outline: state.phases.has(p) ? '2px solid rgba(240,19,30,.35)' : 'none'}"
              >
                {{ p }}
              </button>
            </div>
          </div>

          <hr />

          <div>
            <div class="small" style="margin-bottom:8px">Storylines</div>
            <div class="row">
              <button
                class="pill"
                v-for="s in allStories"
                :key="s"
                @click="toggleSet(state.stories, s)"
                :style="{outline: state.stories.has(s) ? '2px solid rgba(43,124,255,.35)' : 'none'}"
              >
                {{ s }}
              </button>
            </div>
          </div>

          <hr />

          <div>
            <div class="small" style="margin-bottom:8px">Characters (AND filter)</div>
            <input class="search" style="width:100%" v-model="state.q" placeholder="Search title, story, characters… (same as main search)" />
            <div class="row" style="margin-top:10px">
              <button
                class="pill"
                v-for="c in allChars.slice(0, 120)"
                :key="c"
                @click="toggleSet(state.chars, c)"
                :style="{outline: state.chars.has(c) ? '2px solid rgba(240,19,30,.35)' : 'none'}"
              >
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

<script lang="ts">
import { defineComponent, computed, nextTick } from "vue";
import { ITEMS } from "./data/mcu";

type Kind = typeof ITEMS[number]["kind"];

export default defineComponent({
  name: "App",

  data() {
    return {
      ITEMS,

      view: "timeline" as "cards" | "timeline" | "release",
      showFilters: false,

      expandedChars: new Set<string>(),

      state: {
        q: "",
        kinds: new Set<Kind>(["Film", "Series", "Special", "One-Shot"] as Kind[]),
        phases: new Set<string>(),
        stories: new Set<string>(),
        chars: new Set<string>(),
      },

      // timeline rendering state
      timelineNodes: [] as { id: string; y: number }[],
      timelineSvgHeight: 0,
      timelineSvgWidth: 0,
      branchX: 52,

      ro: null as ResizeObserver | null,
      keyHandler: null as ((e: KeyboardEvent) => void) | null,
    };
  },

  computed: {
    kindOptions(): Kind[] {
      // keep the list stable
      return ["Film", "Series", "Special", "One-Shot"] as Kind[];
    },

    allPhases(): string[] {
      return Array.from(new Set(this.ITEMS.map((i: any) => i.phase))).sort();
    },

    allStories(): string[] {
      return Array.from(new Set(this.ITEMS.flatMap((i: any) => i.stories || []))).sort();
    },

    allChars(): string[] {
      return Array.from(new Set(this.ITEMS.flatMap((i: any) => i.characters || []))).sort();
    },

    filtered(): any[] {
      const q = this.norm(this.state.q);

      return this.ITEMS.filter((it: any) => {
        if (!this.state.kinds.has(it.kind)) return false;
        if (this.state.phases.size && !this.state.phases.has(it.phase)) return false;

        if (this.state.stories.size) {
          for (const s of this.state.stories) {
            if (!it.stories?.includes(s)) return false;
          }
        }

        if (this.state.chars.size) {
          for (const c of this.state.chars) {
            if (!it.characters?.includes(c)) return false;
          }
        }

        if (q) {
          const hay = [
            it.title,
            it.kind,
            it.phase,
            it.timeline,
            String(it.timelineYear ?? ""),
            String(it.timelineOrder ?? ""),
            String(it.releaseYear ?? ""),
            it.synopsis,
            (it.stories || []).join(" "),
            (it.characters || []).join(" "),
          ]
            .join(" ")
            .toLowerCase();

          if (!hay.includes(q)) return false;
        }

        return true;
      });
    },

    sorted(): any[] {
      const arr = this.filtered.slice();

      if (this.view === "release") {
        arr.sort(
          (a: any, b: any) =>
            (a.releaseYear - b.releaseYear) || a.title.localeCompare(b.title)
        );
      } else {
        arr.sort(
          (a: any, b: any) =>
            (a.timelineOrder - b.timelineOrder) ||
            (a.timelineYear - b.timelineYear) ||
            (a.releaseYear - b.releaseYear) ||
            a.title.localeCompare(b.title)
        );
      }

      return arr;
    },

    branchPathD(): string {
      // a simple “living” curve that is long enough for the content height
      const h = Math.max(600, this.timelineSvgHeight || 0);
      const x = this.branchX;
      return `M ${x} 0
              C ${x + 6} 160, ${x - 6} 320, ${x} 480
              S ${x + 6} 880, ${x} ${h}`;
    },
  },

  watch: {
    view() {
      this.queueRecomputeTimeline();
    },

    // when list size changes, recompute timeline nodes
    sorted() {
      this.queueRecomputeTimeline();
    },
  },

  mounted() {
    // Focus search when typing anywhere (and / shortcut)
    this.keyHandler = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      const typingInField =
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          (el as any).isContentEditable);

      if (typingInField) return;

      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        (document.getElementById("searchInput") as HTMLInputElement | null)?.focus();
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        (document.getElementById("searchInput") as HTMLInputElement | null)?.focus();
      }
    };

    window.addEventListener("keydown", this.keyHandler, { passive: false });

    const wrap = this.$refs.timelineWrap as HTMLElement | undefined;
    if (wrap) {
      this.ro = new ResizeObserver(() => this.queueRecomputeTimeline());
      this.ro.observe(wrap);
    }

    this.queueRecomputeTimeline();
  },

  beforeUnmount() {
    if (this.keyHandler) window.removeEventListener("keydown", this.keyHandler);
    const wrap = this.$refs.timelineWrap as HTMLElement | undefined;
    if (this.ro && wrap) this.ro.unobserve(wrap);
  },

  methods: {
    norm(s: string) {
      return (s || "").trim().toLowerCase();
    },

    toggleSet<T>(set: Set<T>, v: T) {
      if (set.has(v)) set.delete(v);
      else set.add(v);
    },

    resetAll() {
      this.state.q = "";
      this.state.kinds = new Set<Kind>(["Film", "Series", "Special", "One-Shot"] as Kind[]);
      this.state.phases.clear();
      this.state.stories.clear();
      this.state.chars.clear();
    },

    isExpanded(id: string) {
      return this.expandedChars.has(id);
    },

    toggleExpanded(id: string) {
      if (this.expandedChars.has(id)) this.expandedChars.delete(id);
      else this.expandedChars.add(id);
    },

    chipToggleCharacter(c: string) {
      this.toggleSet(this.state.chars, c);
    },

    formatTimelineYear(y: number): string {
      if (typeof y !== "number" || Number.isNaN(y)) return "—";
      if (y < 0) return `${Math.abs(y)} BC`;
      return String(y);
    },

    stoneColor(st: string): string {
      switch (st) {
        case "Space":
          return "#2b7cff";
        case "Mind":
          return "#ffcf3a";
        case "Reality":
          return "#f0131e";
        case "Power":
          return "#7a3cff";
        case "Time":
          return "#11b870";
        case "Soul":
          return "#ff7a1a";
        default:
          return "#999999";
      }
    },

    queueRecomputeTimeline() {
      // wait for DOM paint; on mobile this reduces “0 height” issues
      requestAnimationFrame(() => {
        this.recomputeTimeline();
      });
    },

    async recomputeTimeline() {
      // only relevant for timeline view
      if (this.view !== "timeline") return;

      await nextTick();

      const wrap = this.$refs.timelineWrap as HTMLElement | undefined;
      if (!wrap) return;

      // width/height
      const rect = wrap.getBoundingClientRect();
      this.timelineSvgWidth = Math.max(240, Math.floor(rect.width));
      this.timelineSvgHeight = Math.max(0, wrap.scrollHeight);

      // branch x position: align with the invisible rail column width
      // Adjust if your CSS changes the timeline column widths.
      this.branchX = 52;

      // compute node y positions relative to wrap
      const rows = Array.from(wrap.querySelectorAll<HTMLElement>(".tItem"));
      const nodes = rows
        .map((r) => {
          const id = r.getAttribute("data-id") || "";
          // approximate “node center” near top of each row; stable across layouts
          const y = r.offsetTop + 28;
          return { id, y };
        })
        .filter((n) => n.id);

      this.timelineNodes = nodes;
    },
  },
});
</script>
