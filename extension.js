import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

Gio._promisify(Gio.File.prototype, 'read_async');
Gio._promisify(Gio.File.prototype, 'replace_contents_async');
Gio._promisify(Gio.InputStream.prototype, 'read_bytes_async', 'read_finish');
Gio._promisify(Gio.InputStream.prototype, 'close_async');

function handler(m) {
  return (e)=>{
    const msg = `[trans-my-gnome@emmeken.net] ${m}`
    console.log(msg,e)
    throw [new Error(msg), e]
  }
}

export default class TransMyGnome extends Extension {
  gtk4ConfigDirectory = Gio.File.new_for_path(GLib.build_filenamev([GLib.get_user_config_dir(), 'gtk-4.0']));
  userGtkStylesheetFile = this.gtk4ConfigDirectory.get_child('gtk.css');
  transMyGnomeStylesheetFile = this.dir.get_child('stylesheets').get_child('trans-my-gnome.css');

  async enable() {
    try {
      await this.setupGtkFolder().catch(handler("Could not set up GTK config forlder correctly."))

      const oldUserGtkStylesheet = await this.readFileContents(this.userGtkStylesheetFile).catch(handler("Could not get gtk.css contents."))
      const newUserGtkStylesheet = this.addTransMyGnomeImport(oldUserGtkStylesheet)
      await this.replaceFileContents(this.userGtkStylesheetFile,newUserGtkStylesheet).catch(handler("Could not replace gtk.css contents."))
    }
    catch (e) {
      console.error(e)
    }
  }

  async disable() {
    try {
      const oldUserGtkStylesheet = await this.readFileContents(this.userGtkStylesheetFile).catch("Could not get gtk.css contens.")
      const newUserGtkStylesheet = this.removeTransMyGnomeImport(oldUserGtkStylesheet)
      await this.replaceFileContents(this.userGtkStylesheetFile,newUserGtkStylesheet).catch(handler("Could not replace gtk.css contents."))
    }
    catch (e) {
      console.error(e)
    }
  }

  addLine(line,contents) { return contents + (/\n$/.test(contents)) ? line : '\n' + line }
  removeLine(line,contents) { return contents.replace(new RegExp("\n?"+line), "") }

  async readFileContents(file) {
    let string = ''
    if (file.query_exists(null)) {
      const stream = await file.read_async(GLib.PRIORITY_DEFAULT, null).catch(handler(`Could not open file for reading ${file.get_path()}`))
      const bytes = await stream.read_bytes_async(4096, GLib.PRIORITY_DEFAULT, null).catch(handler(`Could note read file ${file.get_path()}`))
      stream.close_async(null)
      string = bytes.toString()
    }
    return string
  }

  async replaceFileContents(file,contents) {
    await file.replace_contents_async(new GLib.Bytes(contents), null, true, null, null).catch(handler(`Failed to replace contents of a file '${file.get_path()}'.`))
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
