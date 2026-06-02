import { Outlet, useLocation } from 'react-router-dom'

const BOOK_DETAIL_PATH = /^\/books\/\d+$/

export function PageTransition() {
  const location = useLocation()
  const isBookDetail = BOOK_DETAIL_PATH.test(location.pathname)

  return (
    <div
      key={location.pathname}
      className={isBookDetail ? 'page-enter-detail' : 'page-enter'}
    >
      <Outlet />
    </div>
  )
}
