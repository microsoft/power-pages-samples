const paths = {
  spark: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z',
  case: 'M4 7h16v13H4V7Zm4 0V4h8v3M4 12h16m-10 0v3h4v-3',
  person: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  search: 'M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Zm-2 5 6 6',
  bell: 'M6 9a6 6 0 0 1 12 0v7l2 2H4l2-2V9Zm4 12h4',
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'm6 6 12 12M6 18 18 6',
  book: 'M12 5C8 2 3 3 3 3v16s5-1 9 2c4-3 9-2 9-2V3s-5-1-9 2Zm0 0v16',
  alert: 'M12 3 2 21h20L12 3Zm0 6v5m0 3v1',
  chat: 'M21 11a9 9 0 0 1-9 9H4l-2 2v-9a9 9 0 1 1 19-2Z',
  check: 'm5 12 4 4L19 6',
  plus: 'M12 5v14M5 12h14',
  signIn: 'M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M3 12h11m-4-4 4 4-4 4',
  signOut: 'M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4m4-12 4 4-4 4m4-4H9',
  expand: 'M14 4h6v6M10 20H4v-6m16-10-7 7M4 20l7-7',
  restore: 'M4 10h6V4m10 10h-6v6M10 10 3 3m11 11 7 7',
  minimize: 'M5 12h14',
  external: 'M7 17 17 7M8 7h9v9',
  info: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM12 11v6m0-9v.5',
}
export type IconName = keyof typeof paths
export default function Icon({ name, progression = false }: { name: IconName; progression?: boolean }) {
  return <svg className={`icon${progression ? ' progression' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}
