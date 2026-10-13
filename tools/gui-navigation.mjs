// Use actual navigation/summary clicks; keep the probes compatible with the old page.
export async function openGuiPage(page,name){const button=page.locator(`[data-page="${name}"]`);if(await button.count())await button.click();}
export async function expandGuiPanel(page,id){const panel=page.locator('#'+id);if(await panel.count()&&!await panel.evaluate(el=>el.open))await panel.locator(':scope > summary').click();}
