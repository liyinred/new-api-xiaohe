import type { PricingModel } from '@/api/model-square'
import ai21Icon from '@lobehub/icons-static-svg/icons/ai21.svg?url'
import ai360Icon from '@lobehub/icons-static-svg/icons/ai360-color.svg?url'
import anthropicIcon from '@lobehub/icons-static-svg/icons/anthropic.svg?url'
import awsIcon from '@lobehub/icons-static-svg/icons/aws-color.svg?url'
import baaiIcon from '@lobehub/icons-static-svg/icons/baai.svg?url'
import baichuanIcon from '@lobehub/icons-static-svg/icons/baichuan-color.svg?url'
import bflIcon from '@lobehub/icons-static-svg/icons/bfl.svg?url'
import claudeIcon from '@lobehub/icons-static-svg/icons/claude-color.svg?url'
import cohereIcon from '@lobehub/icons-static-svg/icons/cohere-color.svg?url'
import deepseekIcon from '@lobehub/icons-static-svg/icons/deepseek-color.svg?url'
import doubaoIcon from '@lobehub/icons-static-svg/icons/doubao-color.svg?url'
import geminiIcon from '@lobehub/icons-static-svg/icons/gemini-color.svg?url'
import grokIcon from '@lobehub/icons-static-svg/icons/grok.svg?url'
import hunyuanIcon from '@lobehub/icons-static-svg/icons/hunyuan-color.svg?url'
import internlmIcon from '@lobehub/icons-static-svg/icons/internlm-color.svg?url'
import jimengIcon from '@lobehub/icons-static-svg/icons/jimeng-color.svg?url'
import jinaIcon from '@lobehub/icons-static-svg/icons/jina.svg?url'
import klingIcon from '@lobehub/icons-static-svg/icons/kling-color.svg?url'
import metaIcon from '@lobehub/icons-static-svg/icons/meta-color.svg?url'
import microsoftIcon from '@lobehub/icons-static-svg/icons/microsoft-color.svg?url'
import midjourneyIcon from '@lobehub/icons-static-svg/icons/midjourney.svg?url'
import minimaxIcon from '@lobehub/icons-static-svg/icons/minimax-color.svg?url'
import mistralIcon from '@lobehub/icons-static-svg/icons/mistral-color.svg?url'
import moonshotIcon from '@lobehub/icons-static-svg/icons/moonshot.svg?url'
import nousResearchIcon from '@lobehub/icons-static-svg/icons/nousresearch.svg?url'
import nvidiaIcon from '@lobehub/icons-static-svg/icons/nvidia-color.svg?url'
import openaiIcon from '@lobehub/icons-static-svg/icons/openai.svg?url'
import perplexityIcon from '@lobehub/icons-static-svg/icons/perplexity-color.svg?url'
import qwenIcon from '@lobehub/icons-static-svg/icons/qwen-color.svg?url'
import sparkIcon from '@lobehub/icons-static-svg/icons/spark-color.svg?url'
import stabilityIcon from '@lobehub/icons-static-svg/icons/stability-color.svg?url'
import stepfunIcon from '@lobehub/icons-static-svg/icons/stepfun-color.svg?url'
import sunoIcon from '@lobehub/icons-static-svg/icons/suno.svg?url'
import viduIcon from '@lobehub/icons-static-svg/icons/vidu-color.svg?url'
import wenxinIcon from '@lobehub/icons-static-svg/icons/wenxin-color.svg?url'
import xiaomiMimoIcon from '@lobehub/icons-static-svg/icons/xiaomimimo.svg?url'
import yiIcon from '@lobehub/icons-static-svg/icons/yi-color.svg?url'
import zaiIcon from '@lobehub/icons-static-svg/icons/zai.svg?url'
import zhipuIcon from '@lobehub/icons-static-svg/icons/zhipu-color.svg?url'

const brandIcons: Record<string, string> = {
  ai21: ai21Icon,
  ai360: ai360Icon,
  anthropic: anthropicIcon,
  aws: awsIcon,
  baai: baaiIcon,
  baichuan: baichuanIcon,
  bfl: bflIcon,
  claude: claudeIcon,
  cohere: cohereIcon,
  deepseek: deepseekIcon,
  doubao: doubaoIcon,
  gemini: geminiIcon,
  grok: grokIcon,
  hunyuan: hunyuanIcon,
  internlm: internlmIcon,
  jimeng: jimengIcon,
  jina: jinaIcon,
  kling: klingIcon,
  meta: metaIcon,
  microsoft: microsoftIcon,
  midjourney: midjourneyIcon,
  minimax: minimaxIcon,
  mistral: mistralIcon,
  moonshot: moonshotIcon,
  nousresearch: nousResearchIcon,
  nvidia: nvidiaIcon,
  openai: openaiIcon,
  perplexity: perplexityIcon,
  qwen: qwenIcon,
  spark: sparkIcon,
  stability: stabilityIcon,
  stepfun: stepfunIcon,
  suno: sunoIcon,
  vidu: viduIcon,
  wenxin: wenxinIcon,
  xiaomimimo: xiaomiMimoIcon,
  yi: yiIcon,
  zai: zaiIcon,
  zhipu: zhipuIcon
}

/**
 * 根据模型或供应商的图标标识获取本地品牌 SVG
 * @param model 模型图标与供应商图标信息
 * @returns 本地 SVG 资源地址；未映射时返回空字符串
 */
export function getModelBrandIcon(model: Pick<PricingModel, 'icon' | 'vendor_icon'>): string {
  const rawIconKey = (model.icon || model.vendor_icon || '').trim().toLowerCase()
  const iconKey = rawIconKey === 'z.ai' ? 'zai' : rawIconKey.split('.')[0]
  return brandIcons[iconKey] || ''
}
