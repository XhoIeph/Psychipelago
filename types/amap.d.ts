import '@amap/amap-jsapi-types'

declare global {
  namespace AMap {
    interface MapOptions {
      /**
       * 标注层高度。设成高于矢量图层的值，底图文字才会压在省界密度色块之上；
       * 官方类型没收录这个字段。
       */
      labelzIndex?: number
    }
    class Scale extends Control {
      constructor(options?: { position?: string; offset?: [number, number] })
    }
  }
  interface Window {
    _AMapSecurityConfig?: { serviceHost: string }
  }
}
