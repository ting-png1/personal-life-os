import { useRef, useState, type ChangeEvent } from 'react'
import { Image as ImageIcon, RotateCcw, Upload } from 'lucide-react'
import { GlassButton } from '@/shared/ui/GlassButton'
import { GlassCard } from '@/shared/ui/GlassCard'
import { BackgroundImageError, prepareCustomBackgroundImage } from '../imageProcessor'
import { useBackgroundStore } from '../store'

export function BackgroundSettingsCard() {
  const inputRef = useRef<HTMLInputElement>(null)
  const preference = useBackgroundStore((state) => state.preference)
  const setCustomImage = useBackgroundStore((state) => state.setCustomImage)
  const restoreDefault = useBackgroundStore((state) => state.restoreDefault)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const isCustom = preference.mode === 'custom'

  const handleSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setBusy(true)
    setMessage('正在处理图片…')
    try {
      const imageDataUrl = await prepareCustomBackgroundImage(file)
      const result = setCustomImage(imageDataUrl)
      setMessage(result.ok ? '自定义背景已应用' : '本地空间不足，背景未更改')
    } catch (error) {
      setMessage(error instanceof BackgroundImageError ? error.message : '图片处理失败，请重试')
    } finally {
      setBusy(false)
    }
  }

  const handleRestoreDefault = () => {
    const result = restoreDefault()
    setMessage(result.ok ? '已恢复默认 Pink Mist' : '恢复失败，请重试')
  }

  return (
    <GlassCard>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div
            className="relative w-20 h-20 shrink-0 overflow-hidden rounded-xl border border-white/45 bg-[#ECE8EF]"
            style={
              isCustom
                ? {
                    backgroundImage: `linear-gradient(rgba(238,233,239,0.42), rgba(244,235,238,0.5)), url("${preference.imageDataUrl}")`,
                    backgroundPosition: 'center',
                    backgroundSize: 'cover',
                  }
                : {
                    backgroundImage:
                      'radial-gradient(circle at 25% 20%, rgba(221,184,192,0.72), transparent 52%), radial-gradient(circle at 80% 78%, rgba(207,196,216,0.8), transparent 58%)',
                  }
            }
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-primary-500/75" strokeWidth={1.7} />
            </div>
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-sm font-medium text-text-primary">
              {isCustom ? '自定义图片' : '默认 Pink Mist'}
            </p>
            <p className="text-xs leading-5 text-text-tertiary mt-1">
              图片会在本机压缩保存，不上传云端，也不参与跨设备同步。
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <GlassButton
            size="sm"
            loading={busy}
            leftIcon={<Upload className="w-4 h-4" />}
            onClick={() => inputRef.current?.click()}
          >
            {isCustom ? '替换图片' : '选择图片'}
          </GlassButton>
          {isCustom && (
            <GlassButton
              size="sm"
              variant="ghost"
              disabled={busy}
              leftIcon={<RotateCcw className="w-4 h-4" />}
              onClick={handleRestoreDefault}
            >
              恢复默认
            </GlassButton>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleSelect}
          />
        </div>

        {message && <p className="text-xs text-primary-500">{message}</p>}
      </div>
    </GlassCard>
  )
}
