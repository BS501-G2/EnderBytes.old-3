<script lang="ts" context="module">
  export type IconThickness = 'solid' | 'regular' | 'thin' | 'light';
  export type IconSize =
    | `${number}${'px' | '%' | 'em' | 'rem'}`
    | '2xs'
    | 'xs'
    | 'sm'
    | 'lg'
    | 'xl'
    | '2xl';

  export type IconRotation = 0 | 90 | 180 | 270;

  export type IconFlip = 'horizontal' | 'vertical' | 'both';

  export type IconColor =
    | `#${string}`
    | `rgb(${string})`
    | `rgba(${string})`
    | `hsl(${string})`
    | 'inherit';

  export interface IconProps {
    icon: string;
    thickness?: IconThickness;
    size?: IconSize;
    color?: IconColor;
    rotate?: IconRotation;
    flip?: IconFlip;
  }
</script>

<script lang="ts">
  const {
    icon,
    thickness = 'regular',
    size = '1em',
    color = 'inherit',
    rotate = 0,
    flip
  }: IconProps = $props();
</script>

{#if ['2xs', 'xs', 'sm', 'lg', 'xl', '2xl'].includes(size)}
  <i
    class="fa-{thickness} fa-{icon} fa-{size} {rotate !== 0 ? ` fa-rotate-${rotate}` : ''}{flip !=
    null
      ? ` fa-flip-${flip}`
      : ''}"
    style="color: {color};"
  ></i>
{:else}
  <i
    class="fa-{thickness} fa-{icon}{rotate !== 0 ? ` fa-rotate-${rotate}` : ''}{flip != null
      ? ` fa-flip-${flip}`
      : ''}"
    style="font-size: {size}; color: {color}; font-size: {size};"
  ></i>
{/if}
