"""Original miniature directory drawings; decorative, static and dependency-free."""

DRAWINGS = {
    # A shared connection between homes, without implying coverage or signal data.
    'keep-us-connected': '''
      <path class="sketch-wash" d="M8 33 39 15l42 12 16 26-30 15-46-8Z"/>
      <path class="sketch-guide" d="m17 51 36 10 33-19M53 61V35"/>
      <path d="m10 37 12-8 12 8v17l-24-6ZM10 37l24 7M22 41v11m47-19 12-8 12 8v17l-24-6ZM69 33l24 7M81 37v11"/>
      <rect x="42" y="22" width="24" height="14" rx="3"/>
      <path d="M48 22v-7m12 7v-7m-11-5a10 10 0 0 1 10 0m-14-5a17 17 0 0 1 18 0M48 29h2m5 0h5"/>
      <circle class="sketch-dot" cx="53" cy="61" r="2.5"/>
    ''',
    # An exploded fastener and bracket, rather than a second enlarged wrench icon.
    'who-can-fix-this': '''
      <path class="sketch-wash" d="m12 43 25-29 45 6 12 27-27 20-40-7Z"/>
      <path class="sketch-guide" d="m14 58 74-43M49 17v46"/>
      <path d="m18 49 29-17 17 10-29 17-17-10Zm0 0v7l17 10 29-17v-7M35 59v7"/>
      <ellipse cx="48" cy="42" rx="6" ry="3.5"/>
      <path d="m39 20 10-6 10 6-10 6-10-6Zm0 0v6l10 6 10-6v-6m-10 6v6M49 32v7m25-14 9-5 9 5-9 5-9-5Zm0 0v7l9 5 9-5v-7m-9 5v7"/>
      <path d="m70 49 16 9m-5-12 5 3m-12 3 5 3"/>
    ''',
    'keep-the-basics-on': '''
      <path class="sketch-wash" d="M9 23 39 12l49 14 6 28-35 13-40-11Z"/>
      <path class="sketch-guide" d="M10 59h86"/>
      <path d="M19 59V36h18v-9h21M28 36v23m-14-16h28m-14 8h14"/>
      <circle cx="69" cy="27" r="14"/>
      <path d="M60 30a10 10 0 0 1 18 0m-9 0 6-7M69 41v18m-7-7h14"/>
      <path d="M89 43c-3 5-6 8-6 11a6 6 0 0 0 12 0c0-3-3-6-6-11Z"/>
      <circle class="sketch-dot" cx="69" cy="30" r="2"/>
    ''',
    'what-am-i-paying-for': '''
      <path class="sketch-wash" d="m8 27 32-14 42 9 14 27-29 19-46-9Z"/>
      <path class="sketch-guide" d="M13 62h83"/>
      <path d="m22 52-4-31 30-4 4 30M27 22l29-6 10 45-6-2-4 4-5-3-5 4-5-3-5 4-9-43Z"/>
      <path d="m36 29 15-3m-14 9 15-3m-13 10 8-2m-5 11 13-3"/>
      <rect x="70" y="30" width="23" height="31" rx="3"/>
      <path d="M75 37h13m-13 7h2m5 0h1m5 0h.1M75 50h2m5 0h1m5 0h.1M75 56h2m5 0h6"/>
    ''',
    'plan-for-disruption': '''
      <path class="sketch-wash" d="m7 31 26-18 48 8 17 31-32 16-45-8Z"/>
      <path d="m12 31 26-9 27 9 27-9v35l-27 9-27-9-26 9V31ZM38 22v35m27-26v35"/>
      <path class="sketch-guide" d="m15 47 19-6 20 11 17-11 17 4"/>
      <path d="m22 51 17-9 13 4 24-15"/>
      <circle class="sketch-dot" cx="22" cy="51" r="2.5"/>
      <path d="M83 20c0 6-7 12-7 12s-7-6-7-12a7 7 0 0 1 14 0Z"/>
      <circle cx="76" cy="20" r="2"/>
    ''',
    'tools': '''
      <path class="sketch-wash" d="m10 24 33-12 44 13 10 28-37 14-40-11Z"/>
      <rect x="15" y="23" width="22" height="34" rx="3"/>
      <path d="M20 31h12m-12 8h2m5 0h1m4 0h.1M20 46h2m5 0h1m4 0h.1M20 52h2m5 0h5"/>
      <path d="m44 19 24 3-4 37-24-3 4-37Zm5 10 11 1m-12 7 11 1m-12 7 7 1"/>
      <path d="m73 47 14-23 6 4-14 23-7 5 1-9Zm0 0 6 4m7-25 6 4M72 62h22"/>
    ''',
}


def directory_graphic(key):
    return f'<svg class="directory-sketch" width="104" height="76" viewBox="0 0 104 76" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">{DRAWINGS[key]}</svg>'
