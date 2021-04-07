import { browser, element, by, ElementFinder, ElementArrayFinder } from 'protractor';

const expectedH1 = 'Tour of Trails';
const expectedTitle = `${expectedH1}`;
const targetTrail = { id: 15, name: 'Magneta' };
const targetTrailDashboardIndex = 3;
const nameSuffix = 'X';
const newTrailName = targetTrail.name + nameSuffix;

class Trail {
  id: number;
  name: string;

  // Factory methods

  // Trail from string formatted as '<id> <name>'.
  static fromString(s: string): Trail {
    return {
      id: +s.substr(0, s.indexOf(' ')),
      name: s.substr(s.indexOf(' ') + 1),
    };
  }

  // Trail from trail list <li> element.
  static async fromLi(li: ElementFinder): Promise<Trail> {
    const stringsFromA = await li.all(by.css('a')).getText();
    const strings = stringsFromA[0].split(' ');
    return { id: +strings[0], name: strings[1] };
  }

  // Trail id and name from the given detail element.
  static async fromDetail(detail: ElementFinder): Promise<Trail> {
    // Get trail id from the first <div>
    const id = await detail.all(by.css('div')).first().getText();
    // Get name from the h2
    const name = await detail.element(by.css('h2')).getText();
    return {
      id: +id.substr(id.indexOf(' ') + 1),
      name: name.substr(0, name.lastIndexOf(' '))
    };
  }
}

describe('Tutorial part 6', () => {

  beforeAll(() => browser.get(''));

  function getPageElts() {
    const navElts = element.all(by.css('app-root nav a'));

    return {
      navElts,

      appDashboardHref: navElts.get(0),
      appDashboard: element(by.css('app-root app-dashboard')),
      topTrails: element.all(by.css('app-root app-dashboard > div a')),

      appTrailsHref: navElts.get(1),
      appTrails: element(by.css('app-root app-trails')),
      allTrails: element.all(by.css('app-root app-trails li')),
      selectedTrailSubview: element(by.css('app-root app-trails > div:last-child')),

      trailDetail: element(by.css('app-root app-trail-detail > div')),

      searchBox: element(by.css('#search-box')),
      searchResults: element.all(by.css('.search-result li'))
    };
  }

  describe('Initial page', () => {

    it(`has title '${expectedTitle}'`, async () => {
      expect(await browser.getTitle()).toEqual(expectedTitle);
    });

    it(`has h1 '${expectedH1}'`, async () => {
      await expectHeading(1, expectedH1);
    });

    const expectedViewNames = ['Dashboard', 'Trails'];
    it(`has views ${expectedViewNames}`, async () => {
      const viewNames = await getPageElts().navElts.map(el => el.getText());
      expect(viewNames).toEqual(expectedViewNames);
    });

    it('has dashboard as the active view', async () => {
      const page = getPageElts();
      expect(await page.appDashboard.isPresent()).toBeTruthy();
    });

  });

  describe('Dashboard tests', () => {

    beforeAll(() => browser.get(''));

    it('has top trails', async () => {
      const page = getPageElts();
      expect(await page.topTrails.count()).toEqual(4);
    });

    it(`selects and routes to ${targetTrail.name} details`, dashboardSelectTargetTrail);

    it(`updates trail name (${newTrailName}) in details view`, updateTrailNameInDetailView);

    it(`cancels and shows ${targetTrail.name} in Dashboard`, async () => {
      await element(by.buttonText('go back')).click();
      await browser.waitForAngular(); // seems necessary to gets tests to pass for toh-pt6

      const targetTrailElt = getPageElts().topTrails.get(targetTrailDashboardIndex);
      expect(await targetTrailElt.getText()).toEqual(targetTrail.name);
    });

    it(`selects and routes to ${targetTrail.name} details`, dashboardSelectTargetTrail);

    it(`updates trail name (${newTrailName}) in details view`, updateTrailNameInDetailView);

    it(`saves and shows ${newTrailName} in Dashboard`, async () => {
      await element(by.buttonText('save')).click();
      await browser.waitForAngular(); // seems necessary to gets tests to pass for toh-pt6

      const targetTrailElt = getPageElts().topTrails.get(targetTrailDashboardIndex);
      expect(await targetTrailElt.getText()).toEqual(newTrailName);
    });

  });

  describe('Trails tests', () => {

    beforeAll(() => browser.get(''));

    it('can switch to Trails view', async () => {
      await getPageElts().appTrailsHref.click();
      const page = getPageElts();
      expect(await page.appTrails.isPresent()).toBeTruthy();
      expect(await page.allTrails.count()).toEqual(10, 'number of trails');
    });

    it('can route to trail details', async () => {
      await getTrailLiEltById(targetTrail.id).click();

      const page = getPageElts();
      expect(await page.trailDetail.isPresent()).toBeTruthy('shows trail detail');
      const trail = await Trail.fromDetail(page.trailDetail);
      expect(trail.id).toEqual(targetTrail.id);
      expect(trail.name).toEqual(targetTrail.name.toUpperCase());
    });

    it(`updates trail name (${newTrailName}) in details view`, updateTrailNameInDetailView);

    it(`shows ${newTrailName} in Trails list`, async () => {
      await element(by.buttonText('save')).click();
      await browser.waitForAngular();
      const expectedText = `${targetTrail.id} ${newTrailName}`;
      expect(await getTrailAEltById(targetTrail.id).getText()).toEqual(expectedText);
    });

    it(`deletes ${newTrailName} from Trails list`, async () => {
      const trailsBefore = await toTrailArray(getPageElts().allTrails);
      const li = getTrailLiEltById(targetTrail.id);
      await li.element(by.buttonText('x')).click();

      const page = getPageElts();
      expect(await page.appTrails.isPresent()).toBeTruthy();
      expect(await page.allTrails.count()).toEqual(9, 'number of trails');
      const trailsAfter = await toTrailArray(page.allTrails);
      // console.log(await Trail.fromLi(page.allTrails[0]));
      const expectedTrails =  trailsBefore.filter(h => h.name !== newTrailName);
      expect(trailsAfter).toEqual(expectedTrails);
      // expect(page.selectedTrailSubview.isPresent()).toBeFalsy();
    });

    it(`adds back ${targetTrail.name}`, async () => {
      const addedTrailName = 'Alice';
      const trailsBefore = await toTrailArray(getPageElts().allTrails);
      const numTrails = trailsBefore.length;

      await element(by.css('input')).sendKeys(addedTrailName);
      await element(by.buttonText('Add trail')).click();

      const page = getPageElts();
      const trailsAfter = await toTrailArray(page.allTrails);
      expect(trailsAfter.length).toEqual(numTrails + 1, 'number of trails');

      expect(trailsAfter.slice(0, numTrails)).toEqual(trailsBefore, 'Old trails are still there');

      const maxId = trailsBefore[trailsBefore.length - 1].id;
      expect(trailsAfter[numTrails]).toEqual({id: maxId + 1, name: addedTrailName});
    });

    it('displays correctly styled buttons', async () => {
      const buttons = await element.all(by.buttonText('x'));

      for (const button of buttons) {
        // Inherited styles from styles.css
        expect(await button.getCssValue('font-family')).toBe('Arial, Helvetica, sans-serif');
        expect(await button.getCssValue('border')).toContain('none');
        expect(await button.getCssValue('padding')).toBe('1px 10px 3px');
        expect(await button.getCssValue('border-radius')).toBe('4px');
        // Styles defined in trails.component.css
        expect(await button.getCssValue('left')).toBe('210px');
        expect(await button.getCssValue('top')).toBe('5px');
      }

      const addButton = element(by.buttonText('Add trail'));
      // Inherited styles from styles.css
      expect(await addButton.getCssValue('font-family')).toBe('Arial, Helvetica, sans-serif');
      expect(await addButton.getCssValue('border')).toContain('none');
      expect(await addButton.getCssValue('padding')).toBe('8px 24px');
      expect(await addButton.getCssValue('border-radius')).toBe('4px');
    });

  });

  describe('Progressive trail search', () => {

    beforeAll(() => browser.get(''));

    it(`searches for 'Ma'`, async () => {
      await getPageElts().searchBox.sendKeys('Ma');
      await browser.sleep(1000);

      expect(await getPageElts().searchResults.count()).toBe(4);
    });

    it(`continues search with 'g'`, async () => {
      await getPageElts().searchBox.sendKeys('g');
      await browser.sleep(1000);
      expect(await getPageElts().searchResults.count()).toBe(2);
    });

    it(`continues search with 'e' and gets ${targetTrail.name}`, async () => {
      await getPageElts().searchBox.sendKeys('n');
      await browser.sleep(1000);
      const page = getPageElts();
      expect(await page.searchResults.count()).toBe(1);
      const trail = page.searchResults.get(0);
      expect(await trail.getText()).toEqual(targetTrail.name);
    });

    it(`navigates to ${targetTrail.name} details view`, async () => {
      const trail = getPageElts().searchResults.get(0);
      expect(await trail.getText()).toEqual(targetTrail.name);
      await trail.click();

      const page = getPageElts();
      expect(await page.trailDetail.isPresent()).toBeTruthy('shows trail detail');
      const trail2 = await Trail.fromDetail(page.trailDetail);
      expect(trail2.id).toEqual(targetTrail.id);
      expect(trail2.name).toEqual(targetTrail.name.toUpperCase());
    });
  });

  async function dashboardSelectTargetTrail() {
    const targetTrailElt = getPageElts().topTrails.get(targetTrailDashboardIndex);
    expect(await targetTrailElt.getText()).toEqual(targetTrail.name);
    await targetTrailElt.click();
    await browser.waitForAngular(); // seems necessary to gets tests to pass for toh-pt6

    const page = getPageElts();
    expect(await page.trailDetail.isPresent()).toBeTruthy('shows trail detail');
    const trail = await Trail.fromDetail(page.trailDetail);
    expect(trail.id).toEqual(targetTrail.id);
    expect(trail.name).toEqual(targetTrail.name.toUpperCase());
  }

  async function updateTrailNameInDetailView() {
    // Assumes that the current view is the trail details view.
    await addToTrailName(nameSuffix);

    const page = getPageElts();
    const trail = await Trail.fromDetail(page.trailDetail);
    expect(trail.id).toEqual(targetTrail.id);
    expect(trail.name).toEqual(newTrailName.toUpperCase());
  }

});

async function addToTrailName(text: string): Promise<void> {
  const input = element(by.css('input'));
  await input.sendKeys(text);
}

async function expectHeading(hLevel: number, expectedText: string): Promise<void> {
  const hTag = `h${hLevel}`;
  const hText = await element(by.css(hTag)).getText();
  expect(hText).toEqual(expectedText, hTag);
}

function getTrailAEltById(id: number): ElementFinder {
  const spanForId = element(by.cssContainingText('li span.badge', id.toString()));
  return spanForId.element(by.xpath('..'));
}

function getTrailLiEltById(id: number): ElementFinder {
  const spanForId = element(by.cssContainingText('li span.badge', id.toString()));
  return spanForId.element(by.xpath('../..'));
}

async function toTrailArray(allTrails: ElementArrayFinder): Promise<Trail[]> {
  return allTrails.map(Trail.fromLi);
}
