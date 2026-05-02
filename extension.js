import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

Gio._promisify(Gio.File.prototype, 'read_async');
Gio._promisify(Gio.File.prototype, 'replace_contents_async');
Gio._promisify(Gio.IOStream.prototype, 'read_all_async');
Gio._promisify(Gio.IOStream.prototype, 'close_async');

function handler(m) {
  return (e)=>{throw [new Error(`[trans-my-gnome] ${m}`), e]}
}

export default class TransMyGnome extends Extension {
  gtk4ConfigDirectory = GLib.get_user_config_dir().Gio.File.new_for_path(GLib.build_filenamev([configDir, 'gtk-4.0']));
  userGtkStylesheetFile = this.gtk4ConfigDirectory.get_child('gtk.css');
  transMyGnomeStylesheetFile = this.dir.get_child('stylesheets').get_child('trans-my-gnome.css');

  async enable() {
    await this.setupGtkFolder().catch(handler("Could not set up GTK config forlder correctly."))

    const oldUserGtkStylesheet = await this.readFileContents(this.userGtkStylesheetFile).catch(handler("Could not get gtk.css contents."))
    const newUserGtkStylesheet = this.addTransMyGnomeImport(oldUserGtkStylesheet)
    await this.replaceFileContents(this.userGtkStylesheetFile,newUserGtkStylesheet).catch(handler("Could not replace gtk.css contents."))
  }

  async disable() {
    const oldUserGtkStylesheet = await this.readFileContents(this.userGtkStylesheetFile).catch("Could not get gtk.css contens.")
    const newUserGtkStylesheet = this.removeTransMyGnomeImport(oldUserGtkStylesheet)
    await this.replaceFileContents(this.userGtkStylesheetFile,newUserGtkStylesheet).catch(handler("Could not replace gtk.css contents."))
  }

  addLine(line,contents) { return contents + (/\n$/.test(contents)) ? line : '\n' + line }
  removeLine(line,contents) { return contents.replace(new RegExp("\n?"+line), "") }

  async readFileContents(file) {
    let string = ''
    if (file.query_exists(null)) {
      const stream = await file.read_async(null,true ,null, null).catch(`Could not open file '${file.get_path()}'.`)
      string = await stream.read_all_async(GLib.PRIORITY_DEFAULT, null, null).catch(`Could not read file '${file.get_path()}'.`)
      stream.close_async(null)
    }
    return string
  }

  async replaceFileContents(file,contents) {
    await file.replace_contents_async(GLib.Bytes(contents), GLib.PRIORITY_DEFAULT, null).catch(handler(`Failed to replace contents of a file '${file.get_path()}'.`))
  }

  async setupGtkFolder() {
    if (!this.gtk4ConfigDirectory.query_exists(null)) {
        this.gtk4ConfigDirectory.make_directory_with_parents(null);
    }
  }

  addTransMyGnomeImport(string) {
    const regex = /^.*trans-my-gnome.*$/m
    const importString = `@import ('${this.transMyGnomeStylesheetFile.get_path()}');`;
    return string + (regex.test(string)) ? '' : this.addLine(importString, string)
  }

  removeTransMyGnomeImport(string) {
    const regex = /^.*trans-my-gnome.*$/m
    const toRemove = regex.exec(string)[0]
    return removeLine(toRemove,string)
  }

}
