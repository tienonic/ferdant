"""Shared, local-only tools. Guide text remains available without JavaScript."""


def bill_breakdown():
    return '''<details class="bill-breakdown" data-enhancement hidden>
      <summary>Explain the gap</summary>
      <p>Add changes you have found on the bill. Use minus amounts for decreases. These are your entries, not detected causes.</p>
      <div class="change-inputs">
        <label>Service or rate change ($)<input id="change-service" type="number" min="-999999999.99" max="999999999.99" step="0.01" inputmode="decimal" placeholder="0.00"></label>
        <label>Usage change ($)<input id="change-usage" type="number" min="-999999999.99" max="999999999.99" step="0.01" inputmode="decimal" placeholder="0.00"></label>
        <label>One-time items ($)<input id="change-once" type="number" min="-999999999.99" max="999999999.99" step="0.01" inputmode="decimal" placeholder="0.00"></label>
        <label>Credits or discounts change ($)<input id="change-credits" type="number" min="-999999999.99" max="999999999.99" step="0.01" inputmode="decimal" placeholder="e.g. -5.00"></label>
      </div>
      <div class="gap-result" aria-live="polite"><p id="gap-label">Compare two totals first.</p><div class="gap-track" aria-hidden="true"><span id="gap-fill"></span></div><p id="gap-detail">Then see how much of the difference your entries account for.</p></div>
    </details>'''


def cancellation_planner(heading=2, tool_id='quick-tool'):
    return f'''<section class="interactive cancellation-planner" id="{tool_id}">
      <h{heading}>Plan your cancellation</h{heading}>
      <p>Find the billing route, then keep a record of what happens.</p>
      <div data-enhancement hidden><fieldset class="route-options"><legend>Who bills you?</legend>
        <label><input type="radio" name="billing-route" value="company"> The company directly</label>
        <label><input type="radio" name="billing-route" value="platform"> Another platform</label>
        <label><input type="radio" name="billing-route" value="unknown" checked> I’m not sure</label>
      </fieldset><p id="cancel-route" class="route-result" aria-live="polite">Start with your receipt or statement. Identify the business that charges you before choosing a cancellation route.</p></div>
      <h3>Your record</h3><div class="checklist" id="cancel-record">
        <label><input type="checkbox"> I know which business or platform bills me.</label>
        <label><input type="checkbox"> I saved the request date and confirmation, or a record of my attempt.</label>
        <label><input type="checkbox"> I recorded the stated end or renewal date.</label>
        <label><input type="checkbox"> I checked the next statement for another charge.</label>
      </div>
      <div class="record-progress" data-enhancement hidden><label for="cancel-progress" id="cancel-count">0 of 4 records checked</label><progress id="cancel-progress" max="4" value="0"></progress><p id="cancel-next" aria-live="polite">Next: identify the billing business or platform.</p></div>
      <p class="fine-print">This tracks your notes, not cancellation status. Ending renewal, access and requesting a refund are separate. Checks reset on reload.</p>
    </section>'''


def message_builder(heading=2, tool_id='quick-tool'):
    return f'''<section class="interactive message-builder" id="{tool_id}" data-enhancement hidden>
      <h{heading}>Build a billing message</h{heading}>
      <p>One issue, a short timeline and a specific request. Skip account numbers and identifying details.</p>
      <div class="builder-layout"><form id="message-builder" autocomplete="off">
        <label>What needs explaining?<textarea id="message-issue" rows="3" maxlength="240" placeholder="e.g. A new service fee on my November bill"></textarea></label>
        <label>Important dates or previous contact <span>(optional)</span><input id="message-dates" type="text" maxlength="160" placeholder="e.g. Charged November 1; contacted support November 2"></label>
        <label>What would help?<select id="message-goal"><option value="explain">An explanation of the charge</option><option value="correct">A review and correction</option><option value="confirm">Confirmation of cancellation</option></select></label>
        <button type="reset" class="quiet-button">Clear my notes</button>
      </form><div class="message-preview"><p class="preview-label">Your draft</p><blockquote id="built-message">I’m writing about [the charge or issue]. Please explain the charge and the rate or term behind it. I can provide supporting records through your verified secure channel.</blockquote><button class="copy-button" data-copy="built-message" hidden>Copy my draft</button><p class="copy-status" role="status"></p></div></div>
      <p class="fine-print">Nothing is sent or saved here. This draft does not replace a formal dispute, appeal or required notice.</p>
    </section>'''
