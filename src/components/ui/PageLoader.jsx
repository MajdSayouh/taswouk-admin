import { Spin } from 'antd'

export function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center py-16">
      <Spin size="large" />
    </div>
  )
}
