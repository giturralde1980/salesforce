import { Page } from '@playwright/test';
import BasePage from './BasePage';

interface SectionItem {
  index: number;
  dataName: string | null;
  text: string;
  visible: boolean;
  tagName: string;
  className: string;
}

interface SectionData {
  found: boolean;
  totalItems?: number;
  visibleItems?: SectionItem[];
  items: SectionItem[];
  error?: string;
}

interface MenuVerificationResult {
  success: boolean;
  visibleDataNames: (string | null)[];
  expectedDataNames: string[];
  missing: string[];
  extra: (string | null)[];
  allItems: SectionItem[];
}

export default class MyCockpitPage extends BasePage {
  readonly myProfileSection: string;
  readonly myContactPreferencesSection: string;
  readonly cockpitTitle: string;

  constructor(page: Page) {
    super(page);
    this.myProfileSection = 'text=My Profile';
    this.myContactPreferencesSection = 'text=My Contact Preferences';
    this.cockpitTitle = 'text=MEIN COCKPIT';
  }

  async isOnMyCockpitPage(): Promise<boolean> {
    try {
      await this.page.waitForSelector(this.cockpitTitle, { timeout: 5000 });
      return await this.page.isVisible(this.cockpitTitle);
    } catch (error) {
      return false;
    }
  }

  async getAllSectionItemsData(): Promise<SectionData> {
    const sectionData = await this.page.evaluate(() => {
      const section = document.querySelector('.slds-nav-vertical__section');

      if (!section) {
        return {
          found: false,
          items: [] as any[],
          error: '.slds-nav-vertical__section no encontrado'
        };
      }

      const allWithDataName = section.querySelectorAll('[data-name]');
      const items: any[] = [];

      allWithDataName.forEach((el, index) => {
        const isVisible = (el as HTMLElement).offsetParent !== null;
        items.push({
          index,
          dataName: el.getAttribute('data-name'),
          text: el.textContent?.trim() ?? '',
          visible: isVisible,
          tagName: el.tagName,
          className: el.className
        });
      });

      const visibleItems = items.filter(item => item.visible);

      return {
        found: true,
        totalItems: items.length,
        visibleItems: visibleItems,
        items: visibleItems
      };
    });

    return sectionData as SectionData;
  }

  async verifyMenuItems(expectedDataNames: string[]): Promise<MenuVerificationResult> {
    const data = await this.getAllSectionItemsData();
    const visibleDataNames = data.items?.filter(item => item.visible).map(item => item.dataName) ?? [];

    const missing = expectedDataNames.filter(name => !visibleDataNames.includes(name));
    const extra = visibleDataNames.filter(name => !expectedDataNames.includes(name as string));

    return {
      success: missing.length === 0 && extra.length === 0,
      visibleDataNames,
      expectedDataNames,
      missing,
      extra,
      allItems: data.items
    };
  }
}
